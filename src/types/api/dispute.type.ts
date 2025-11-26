export interface DisputeSummary {
  disputeId: number
  title: string
  type: string
  status: string
  severity?: string
  createdAt: string
  reporterName?: string
  groupName?: string
  assignedStaffName?: string
}

export interface SimpleUser {
  userId: number
  fullName: string
  email: string
}

export interface DisputeComment {
  commentId: number
  content: string
  visibility: string
  createdAt: string
  author?: SimpleUser
}

export interface DisputeDetail {
  disputeId: number
  groupId: number
  bookingId?: number
  groupName?: string
  vehicleInfo?: string
  title: string
  description?: string
  evidenceUrls?: string
  type: string
  status: string
  severity?: string
  createdAt: string
  updatedAt: string
  reporter?: SimpleUser
  targetUser?: SimpleUser
  assignedStaff?: SimpleUser
  resolutionNote?: string
  comments: DisputeComment[]
}




