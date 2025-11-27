import type { DisputeDetail, DisputeSummary, DisputeComment } from '../types/api/dispute.type'
import http from '../utils/http'

const disputeApi = {
  list: (params: { status?: string; groupId?: string; page?: number; size?: number }) => {
    return http.get<{ content: DisputeSummary[]; totalElements: number }>('api/disputes', {
      params
    })
  },
  detail: (disputeId: string) => {
    return http.get<DisputeDetail>(`api/disputes/${disputeId}`)
  },
  updateStatus: (disputeId: string, body: { status?: string; resolutionNote?: string; assignedStaffId?: string }) => {
    return http.post<DisputeDetail>(`api/disputes/${disputeId}/status`, body)
  },
  addComment: (disputeId: string, body: { visibility: string; content: string }) => {
    return http.post<DisputeComment>(`api/disputes/${disputeId}/comments`, body)
  }
}

export default disputeApi





