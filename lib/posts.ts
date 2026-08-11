export interface HistoryPost {
  id: string
  client: string
  theme: string
  mode: string
  isCarousel: boolean
  imageUrls: string[]
  imageUrl: string
  content: string
  date: string
}

export interface StoredHistoryPost extends HistoryPost {
  timestamp: number
}
