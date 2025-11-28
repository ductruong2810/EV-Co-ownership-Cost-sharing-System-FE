import type {
  ContractDetail,
  ContractResponse,
  ContractsForEditResponse,
  FeedbackCoOwnerResponse
} from '../types/api/admin.type'
import type { BookingResponse } from '../types/api/staff.type'
import http from '../utils/http'

type ContractApproveAction = 'APPROVE' | 'REJECT'

// Gom thành obj cho tiện dễ xài
const adminApi = {
  getAllContracts: () => {
    return http.get<ContractResponse[]>('api/admin/contracts')
  },

  getAllContractPending: () => {
    return http.get<ContractResponse[]>('api/admin/contracts/pending')
  },

  approveContract: (contractId: number, action: ContractApproveAction, reason?: string) => {
    return http.put('/api/admin/contracts/approve', {
      contractId,
      action,
      reason
    })
  },

  //lấy all qr booking by userId và groupId
  getQrBookingByUserIdAndGroupId({ userId, groupId }: { userId: number; groupId: number }) {
    return http.get<BookingResponse>('api/bookings/admin/search', {
      params: {
        userId,
        groupId
      }
    })
  },
  getContractsForEdit: () => {
    return http.get<ContractsForEditResponse[]>('api/admin/contracts/pending-member-approval')
  },
  // lấy danh sách feedback của  từng hợp đồng
  getFeedbackByContractId: (contractId: string) => {
    return http.get<FeedbackCoOwnerResponse>(`api/contracts/${contractId}/member-feedbacks`)
  },

  // update contract
  updateContract: ({
    contractId,
    startDate,
    endDate,
    terms
  }: {
    contractId: string
    startDate: string
    endDate: string
    terms: string
  }) => {
    return http.put(`api/admin/contracts/${contractId}`, { startDate, endDate, terms })
  },
  // lấy chi tiết hợp đồng dựa trên groupId
  getContractDetailByGroupId: (groupId: number) => {
    return http.get<ContractDetail>(`api/contracts/${groupId}/details`)
  },

  // ========== User Management ==========
  // Create Staff account
  createStaff: (data: {
    fullName: string
    email: string
    phoneNumber: string
    password: string
  }) => {
    return http.post('api/admin/users/staff', data)
  },

  // Create Technician account
  createTechnician: (data: {
    fullName: string
    email: string
    phoneNumber: string
    password: string
  }) => {
    return http.post('api/admin/users/technician', data)
  },

  // Get all Staff accounts
  getAllStaff: () => {
    return http.get('api/admin/users/staff')
  },

  // Get all Technician accounts
  getAllTechnicians: () => {
    return http.get('api/admin/users/technician')
  },

  // ========== Dashboard Statistics ==========
  getDashboardStatistics: (params?: { from?: string; to?: string; periodType?: string }) => {
    return http.get('api/admin/dashboard/statistics', { params })
  }
}

export default adminApi
