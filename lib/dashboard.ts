export interface DashboardSeriesPoint {
  date: string
  label: string
  posts: number
}

export interface DashboardClientVolume {
  name: string
  posts: number
}

export interface DashboardActivity {
  id: string
  client: string
  theme: string
  date: string
  kind: 'post' | 'studio-video'
}

export interface DashboardStats {
  totals: {
    postsGenerated: number
    postsToday: number
    imageAssets: number
    carouselPosts: number
    archivedPosts: number
    studioVideos: number
    clients: number
    activeClients: number
  }
  postsByDay: DashboardSeriesPoint[]
  postsByClient: DashboardClientVolume[]
  recentActivity: DashboardActivity[]
  generatedAt: string
}
