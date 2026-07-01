import AdminAnnouncementsClient from './AdminAnnouncementsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function AdminAnnouncementsPage() {
  return <AdminAnnouncementsClient />
}
