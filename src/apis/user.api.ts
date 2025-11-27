// file chứa những method call api cho user/co-owner

import type { CheckoutForm } from '../pages/GroupPage/pages/CheckOutResult/CheckOutResult'
import type {
  CreateVotingPayload,
  CreateVotingResponse,
  DocumentInfo,
  GetAllNotifications,
  MaintenancePaymentResponse,
  PaymentHistory,
  UploadImage,
  UserGetProfile,
  Voting,
  VotingSubmitPayload,
  VotingSubmitResponse
} from '../types/api/user.type'
import { getAccessTokenFromLS } from '../utils/auth'
import http from '../utils/http'

const accessToken = getAccessTokenFromLS()

const userApi = {
  //api giup lay thong tin user ve
  getProfile() {
    return http.get<UserGetProfile>('api/user/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
  },

  // Preview OCR (extract but don't save)
  previewOcr(documentType: 'DRIVER_LICENSE' | 'CITIZEN_ID', frontFile: File, backFile: File) {
    const accessToken = getAccessTokenFromLS()
    const formData = new FormData()

    formData.append('documentType', documentType)
    formData.append('frontFile', frontFile)
    formData.append('backFile', backFile)

    return http.post<UploadImage>('api/user/documents/preview-ocr', formData, {
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  uploadLicense(frontFile: File, backFile: File, editedInfo?: DocumentInfo) {
    const accessToken = getAccessTokenFromLS()
    const formData = new FormData()

    formData.append('documentType', 'DRIVER_LICENSE')
    formData.append('frontFile', frontFile)
    formData.append('backFile', backFile)

    // Add edited info if provided
    if (editedInfo) {
      if (editedInfo.idNumber) formData.append('editedIdNumber', editedInfo.idNumber)
      if (editedInfo.fullName) formData.append('editedFullName', editedInfo.fullName)
      if (editedInfo.dateOfBirth) formData.append('editedDateOfBirth', editedInfo.dateOfBirth)
      if (editedInfo.issueDate) formData.append('editedIssueDate', editedInfo.issueDate)
      if (editedInfo.expiryDate) formData.append('editedExpiryDate', editedInfo.expiryDate)
      if (editedInfo.address) formData.append('editedAddress', editedInfo.address)
    }

    return http.post<UploadImage>('api/user/documents/upload-batch', formData, {
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  //api giup upload CCCD
  uploadCitizenId(frontFile: File, backFile: File, editedInfo?: DocumentInfo) {
    const accessToken = getAccessTokenFromLS()
    const formData = new FormData()

    formData.append('documentType', 'CITIZEN_ID')
    formData.append('frontFile', frontFile)
    formData.append('backFile', backFile)

    // Add edited info if provided
    if (editedInfo) {
      if (editedInfo.idNumber) formData.append('editedIdNumber', editedInfo.idNumber)
      if (editedInfo.fullName) formData.append('editedFullName', editedInfo.fullName)
      if (editedInfo.dateOfBirth) formData.append('editedDateOfBirth', editedInfo.dateOfBirth)
      if (editedInfo.issueDate) formData.append('editedIssueDate', editedInfo.issueDate)
      if (editedInfo.expiryDate) formData.append('editedExpiryDate', editedInfo.expiryDate)
      if (editedInfo.address) formData.append('editedAddress', editedInfo.address)
    }

    return http.post<UploadImage>('api/user/documents/upload-batch', formData, {
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  //api enter percentage
  updatePercentage(percentage: number, groupId: string) {
    return http.put(`api/shares/my-percentage/${groupId}`, {
      ownershipPercentage: percentage,
      reason: 'Update Percentage'
    })
  },

  //get all notification for user
  getAllNotification() {
    return http.get<GetAllNotifications[]>('api/notifications')
  },
  //change isRead in notification
  readNotification(notificationId: string) {
    return http.put(`api/notifications/${notificationId}/read`)
  },

  // send report checkout
  sendCheckoutReport(body: CheckoutForm & { signature?: string }) {
    return http.post('api/vehicle-checks/checkout/submit', body)
  },
  // show page notification checkout
  showpageNotificationCheckout(bookingId: string) {
    return http.get(`api/vehicle-checks/booking/${bookingId}/post-use`)
  },
  //get all voting
  getAllVoting(groupId: number) {
    return http.get<Voting[]>('api/votings', {
      params: { groupId }
    })
  },
  //create voting
  createVoting(body: CreateVotingPayload) {
    return http.post<CreateVotingResponse>('api/votings', body)
  },
  //voting
  voting(body: VotingSubmitPayload) {
    return http.post<VotingSubmitResponse>('api/votings/vote', body)
  },
  //edit profile
  //edit phone
  editPhoneNumber(userId: string, newPhoneNumber: string) {
    return http.patch('api/users/profile/phone', {
      userId,
      phoneNumber: newPhoneNumber
    })
  },
  editFullName(userId: string, newFullName: string) {
    return http.patch('api/users/profile/name', {
      userId,
      fullName: newFullName
    })
  },
  //getHistoryPayments
  getHistoryPayments(userId: number, fromDate?: string, toDate?: string) {
    return http.get<PaymentHistory>('api/payments/history', {
      params: { userId, fromDate, toDate }
    })
  },
  // getAllPaymentMaintance
  getAllPaymentMaintance() {
    return http.get(`api/after-checkout/maintenances/my-liabilities`)
  },
  // payment maintenance
  paymentMaintenance(maintenanceId: string) {
    return http.post<MaintenancePaymentResponse>(`api/maintenances/payments/create/${maintenanceId}`)
  },
  // đồng ý feedback
  acceptFeedback: ({ feedbackId, adminNote }: { feedbackId: string; adminNote: string }) => {
    return http.put(`api/admin/contracts/feedbacks/${feedbackId}/approve`, { adminNote })
  },
  // từ chối feedback
  rejectFeedback: ({ feedbackId, adminNote }: { feedbackId: string; adminNote: string }) => {
    return http.put(`api/admin/contracts/feedbacks/${feedbackId}/reject`, { adminNote })
  },
  // admin group send feedback status approve
  groupAdminRejectFeedback: ({ groupId, reason }: { groupId: string; reason: string }) => {
    return http.post(`api/contracts/${groupId}/cancel`, { reason })
  }
}

export default userApi
