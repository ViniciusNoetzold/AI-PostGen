using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace AIPostGenLauncher
{
    static class Program
    {
        private static NotifyIcon trayIcon;
        private static Process serverProcess;
        private static int serverPort = 3000;
        private static string appUrl = "";
        private static bool isExiting = false;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            int preferredPort = ReadConfiguredPort(args);

            // Verifica porta livre a partir da porta preferida
            serverPort = GetFreePort(preferredPort);
            appUrl = "http://localhost:" + serverPort;

            // Cria ícone na barra de tarefas (System Tray)
            trayIcon = new NotifyIcon();
            trayIcon.Text = "AI-PostGen Desktop (Porta " + serverPort + ")";
            trayIcon.Icon = SystemIcons.Application;
            trayIcon.Visible = true;

            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add("🌐 Abrir AI-PostGen", (s, e) => OpenBrowser(appUrl));
            menu.MenuItems.Add("📊 Transcritor YouTube", (s, e) => OpenBrowser(appUrl + "/transcricao"));
            menu.MenuItems.Add("🕸️ Web Scraping Pro", (s, e) => OpenBrowser(appUrl + "/scraper"));
            menu.MenuItems.Add("📄 Orçamentos (QuotePRO)", (s, e) => OpenBrowser(appUrl + "/orcamentos"));
            menu.MenuItems.Add("⚙️ Configurações / Porta", (s, e) => OpenBrowser(appUrl + "/settings"));
            menu.MenuItems.Add("-");
            menu.MenuItems.Add("❌ Sair do AI-PostGen", (s, e) => ExitApplication());
            trayIcon.ContextMenu = menu;

            trayIcon.DoubleClick += (s, e) => OpenBrowser(appUrl);

            // Inicia o servidor em segundo plano
            StartServer();

            // Aguarda servidor ficar online em uma thread separada e abre a janela
            Thread checkerThread = new Thread(WaitForServerAndLaunch);
            checkerThread.IsBackground = true;
            checkerThread.Start();

            // Loop de eventos do Windows
            Application.ApplicationExit += (s, e) => Cleanup();
            Application.Run();
        }

        private static int ReadConfiguredPort(string[] args)
        {
            // 1. Argumentos de linha de comando
            if (args != null && args.Length > 0)
            {
                for (int i = 0; i < args.Length; i++)
                {
                    if ((args[i] == "--port" || args[i] == "-p") && i + 1 < args.Length)
                    {
                        int p;
                        if (int.TryParse(args[i + 1], out p) && p > 1000 && p < 65535) return p;
                    }
                    int directPort;
                    if (int.TryParse(args[i], out directPort) && directPort > 1000 && directPort < 65535) return directPort;
                }
            }

            // 2. global_config.json
            try
            {
                string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "global_config.json");
                if (File.Exists(configPath))
                {
                    string text = File.ReadAllText(configPath);
                    System.Text.RegularExpressions.Match match = System.Text.RegularExpressions.Regex.Match(text, "\"port\"\\s*:\\s*(\\d+)");
                    if (match.Success)
                    {
                        int p = int.Parse(match.Groups[1].Value);
                        if (p > 1000 && p < 65535) return p;
                    }
                }
            }
            catch { }

            // 3. Variável de ambiente PORT
            try
            {
                string envPort = Environment.GetEnvironmentVariable("PORT");
                if (!string.IsNullOrEmpty(envPort))
                {
                    int p;
                    if (int.TryParse(envPort, out p) && p > 1000 && p < 65535) return p;
                }
            }
            catch { }

            return 3000;
        }

        private static int GetFreePort(int startingPort)
        {
            for (int p = startingPort; p < startingPort + 20; p++)
            {
                try
                {
                    TcpListener listener = new TcpListener(IPAddress.Loopback, p);
                    listener.Start();
                    listener.Stop();
                    return p;
                }
                catch
                {
                    // porta ocupada, tenta a próxima
                }
            }
            return startingPort;
        }

        private static void StartServer()
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;

                if (!File.Exists(Path.Combine(baseDir, "package.json")))
                {
                    MessageBox.Show(
                        "O arquivo package.json não foi encontrado na pasta atual:\n" + baseDir + "\n\nCertifique-se de executar o AI-PostGen dentro da pasta do projeto!",
                        "AI-PostGen - Aviso",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c pnpm start -p " + serverPort + " || pnpm dev -p " + serverPort + " || npx next start -p " + serverPort + " || npx next dev -p " + serverPort;
                psi.WorkingDirectory = baseDir;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;

                psi.EnvironmentVariables["PORT"] = serverPort.ToString();

                serverProcess = new Process();
                serverProcess.StartInfo = psi;
                serverProcess.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao iniciar o servidor AI-PostGen: " + ex.Message, "AI-PostGen", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static void WaitForServerAndLaunch()
        {
            int attempts = 0;
            bool online = false;

            while (attempts < 40 && !online && !isExiting)
            {
                Thread.Sleep(800);
                attempts++;

                try
                {
                    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(appUrl);
                    request.Timeout = 1500;
                    request.Method = "HEAD";
                    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                    {
                        if (response.StatusCode == HttpStatusCode.OK || (int)response.StatusCode < 500)
                        {
                            online = true;
                        }
                    }
                }
                catch
                {
                    // ainda iniciando
                }
            }

            if (online && !isExiting)
            {
                OpenBrowser(appUrl);
                trayIcon.ShowBalloonTip(3000, "AI-PostGen", "AI-PostGen está rodando em " + appUrl, ToolTipIcon.Info);
            }
            else if (!online && !isExiting)
            {
                trayIcon.ShowBalloonTip(5000, "AI-PostGen", "O servidor local ainda está inicializando ou encontrou um erro. Clique no ícone da bandeja para abrir quando estiver pronto.", ToolTipIcon.Warning);
            }
        }

        private static void OpenBrowser(string url)
        {
            try
            {
                // Tenta abrir janela de aplicativo no Edge
                string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
                if (File.Exists(edgePath))
                {
                    Process.Start(edgePath, "--app=" + url + " --window-size=1360,860");
                    return;
                }

                // Tenta no Chrome
                string chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe");
                if (!File.Exists(chromePath))
                {
                    chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe");
                }
                if (File.Exists(chromePath))
                {
                    Process.Start(chromePath, "--app=" + url + " --window-size=1360,860");
                    return;
                }

                // Fallback: navegador padrão do sistema
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch
            {
                try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
            }
        }

        private static void ExitApplication()
        {
            isExiting = true;
            Cleanup();
            Application.Exit();
        }

        private static void Cleanup()
        {
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }

            try
            {
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    serverProcess.Kill();
                }
            }
            catch { }

            // Finaliza instâncias filhas do node nesta porta se houver
            try
            {
                ProcessStartInfo killPsi = new ProcessStartInfo("cmd.exe", "/c taskkill /f /im node.exe /fi \"WINDOWTITLE eq AI-PostGen*\"");
                killPsi.WindowStyle = ProcessWindowStyle.Hidden;
                killPsi.CreateNoWindow = true;
                Process.Start(killPsi);
            }
            catch { }
        }
    }
}
