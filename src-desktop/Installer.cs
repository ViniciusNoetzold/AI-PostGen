using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Diagnostics;

namespace AIPostGenInstaller
{
    public class InstallerForm : Form
    {
        private Label titleLabel;
        private Label descLabel;
        private Label pathLabel;
        private TextBox pathBox;
        private Button browseBtn;
        private CheckBox desktopShortcutCheck;
        private CheckBox startMenuShortcutCheck;
        private CheckBox launchAfterCheck;
        private ProgressBar progressBar;
        private Button installBtn;
        private Button cancelBtn;
        private Label statusLabel;

        public InstallerForm()
        {
            this.Text = "Instalação do AI-PostGen";
            this.Size = new Size(520, 380);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            // Header
            titleLabel = new Label()
            {
                Text = "Instalador do AI-PostGen",
                Font = new Font("Segoe UI", 14F, FontStyle.Bold),
                Location = new Point(25, 20),
                AutoSize = true,
                ForeColor = Color.FromArgb(15, 23, 42)
            };

            descLabel = new Label()
            {
                Text = "Este assistente instalará o AI-PostGen com todas as ferramentas integradas:\n• AI Post Gen & Product Studio\n• QuotePRO Orçamentos\n• Web Scraping Pro & Transcritor do YouTube",
                Location = new Point(25, 55),
                Size = new Size(460, 65),
                ForeColor = Color.FromArgb(71, 85, 105)
            };

            // Path selector
            pathLabel = new Label()
            {
                Text = "Pasta de Instalação:",
                Location = new Point(25, 130),
                AutoSize = true,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };

            string defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "AI-PostGen");
            pathBox = new TextBox()
            {
                Text = defaultPath,
                Location = new Point(25, 150),
                Size = new Size(360, 25)
            };

            browseBtn = new Button()
            {
                Text = "Procurar...",
                Location = new Point(395, 148),
                Size = new Size(85, 27),
                BackColor = Color.White
            };
            browseBtn.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.SelectedPath = pathBox.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        pathBox.Text = Path.Combine(fbd.SelectedPath, "AI-PostGen");
                    }
                }
            };

            // Options
            desktopShortcutCheck = new CheckBox()
            {
                Text = "Criar atalho na Área de Trabalho (Desktop)",
                Location = new Point(25, 185),
                AutoSize = true,
                Checked = true
            };

            startMenuShortcutCheck = new CheckBox()
            {
                Text = "Criar atalho no Menu Iniciar",
                Location = new Point(25, 210),
                AutoSize = true,
                Checked = true
            };

            launchAfterCheck = new CheckBox()
            {
                Text = "Iniciar AI-PostGen ao concluir a instalação",
                Location = new Point(25, 235),
                AutoSize = true,
                Checked = true
            };

            progressBar = new ProgressBar()
            {
                Location = new Point(25, 265),
                Size = new Size(455, 15),
                Visible = false
            };

            statusLabel = new Label()
            {
                Text = "",
                Location = new Point(25, 283),
                Size = new Size(455, 18),
                ForeColor = Color.FromArgb(37, 99, 235),
                Font = new Font("Segoe UI", 8.5F, FontStyle.Italic)
            };

            // Action buttons
            installBtn = new Button()
            {
                Text = "Instalar Agora",
                Location = new Point(280, 305),
                Size = new Size(115, 32),
                BackColor = Color.FromArgb(225, 29, 72),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            installBtn.FlatAppearance.BorderSize = 0;
            installBtn.Click += (s, e) => PerformInstallation();

            cancelBtn = new Button()
            {
                Text = "Cancelar",
                Location = new Point(400, 305),
                Size = new Size(80, 32),
                BackColor = Color.White
            };
            cancelBtn.Click += (s, e) => this.Close();

            this.Controls.Add(titleLabel);
            this.Controls.Add(descLabel);
            this.Controls.Add(pathLabel);
            this.Controls.Add(pathBox);
            this.Controls.Add(browseBtn);
            this.Controls.Add(desktopShortcutCheck);
            this.Controls.Add(startMenuShortcutCheck);
            this.Controls.Add(launchAfterCheck);
            this.Controls.Add(progressBar);
            this.Controls.Add(statusLabel);
            this.Controls.Add(installBtn);
            this.Controls.Add(cancelBtn);
        }

        private void PerformInstallation()
        {
            string targetDir = pathBox.Text.Trim();
            if (string.IsNullOrEmpty(targetDir)) return;

            installBtn.Enabled = false;
            browseBtn.Enabled = false;
            pathBox.Enabled = false;
            progressBar.Visible = true;
            progressBar.Style = ProgressBarStyle.Marquee;
            statusLabel.Text = "Copiando arquivos e configurando o sistema...";

            try
            {
                if (!Directory.Exists(targetDir))
                {
                    Directory.CreateDirectory(targetDir);
                }

                string sourceDir = AppDomain.CurrentDomain.BaseDirectory;

                // Copia arquivos do executável launcher e recursos
                CopyDirectory(sourceDir, targetDir);

                string launcherPath = Path.Combine(targetDir, "AI-PostGen.exe");
                if (!File.Exists(launcherPath))
                {
                    string portableInSource = Path.Combine(sourceDir, "AI-PostGen-Portable.exe");
                    if (File.Exists(portableInSource))
                    {
                        File.Copy(portableInSource, launcherPath, true);
                    }
                }

                // Cria atalhos
                if (desktopShortcutCheck.Checked)
                {
                    string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    CreateShortcut(launcherPath, Path.Combine(desktopPath, "AI-PostGen.lnk"), "AI-PostGen - Plataforma Tudo-em-Um");
                }

                if (startMenuShortcutCheck.Checked)
                {
                    string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "AI-PostGen");
                    if (!Directory.Exists(startMenuPath)) Directory.CreateDirectory(startMenuPath);
                    CreateShortcut(launcherPath, Path.Combine(startMenuPath, "AI-PostGen.lnk"), "AI-PostGen - Plataforma Tudo-em-Um");
                }

                statusLabel.Text = "Instalação concluída com sucesso!";
                progressBar.Style = ProgressBarStyle.Blocks;
                progressBar.Value = 100;

                MessageBox.Show("O AI-PostGen foi instalado com sucesso!", "Instalação Concluída", MessageBoxButtons.OK, MessageBoxIcon.Information);

                if (launchAfterCheck.Checked && File.Exists(launcherPath))
                {
                    Process.Start(new ProcessStartInfo(launcherPath) { WorkingDirectory = targetDir });
                }

                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro durante a instalação: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                installBtn.Enabled = true;
                progressBar.Visible = false;
                statusLabel.Text = "Falha na instalação.";
            }
        }

        private static void CopyDirectory(string sourceDir, string targetDir)
        {
            foreach (string file in Directory.GetFiles(sourceDir))
            {
                string name = Path.GetFileName(file);
                if (name.EndsWith("-Setup.exe", StringComparison.OrdinalIgnoreCase)) continue;
                string dest = Path.Combine(targetDir, name);
                File.Copy(file, dest, true);
            }

            foreach (string dir in Directory.GetDirectories(sourceDir))
            {
                string name = Path.GetFileName(dir);
                if (name.Equals("node_modules", StringComparison.OrdinalIgnoreCase) ||
                    name.Equals(".git", StringComparison.OrdinalIgnoreCase) ||
                    name.Equals("release", StringComparison.OrdinalIgnoreCase)) continue;

                string destDir = Path.Combine(targetDir, name);
                if (!Directory.Exists(destDir)) Directory.CreateDirectory(destDir);
                CopyDirectory(dir, destDir);
            }
        }

        private static void CreateShortcut(string targetPath, string shortcutPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                shortcut.Description = description;
                shortcut.Save();
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }
}
