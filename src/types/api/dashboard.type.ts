export interface DashboardStatistics {
  totalUsers: number
  activeUsers: number
  totalCoOwners: number
  totalStaff: number
  totalTechnicians: number
  totalAdmins: number
  totalGroups: number
  activeGroups: number
  pendingGroups: number
  closedGroups: number
  totalVehicles: number
  totalContracts: number
  pendingContracts: number
  signedContracts: number
  approvedContracts: number
  rejectedContracts: number
  totalRevenue: number
  totalPayments: number
  successfulPayments: number
  pendingPayments: number
  failedPayments: number
  totalBookings: number
  confirmedBookings: number
  completedBookings: number
  newUsersLast30Days: number
  newGroupsLast30Days: number
  newContractsLast30Days: number
  usersByRole: Record<string, number>
  groupsByStatus: Record<string, number>
  contractsByStatus: Record<string, number>
  revenueByMonth: Record<string, number>
}










