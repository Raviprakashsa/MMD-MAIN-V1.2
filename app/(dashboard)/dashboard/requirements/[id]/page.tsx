import { redirect } from 'next/navigation'

interface RequirementDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function RequirementDetailPage({ params }: Readonly<RequirementDetailPageProps>) {
  const { id } = await params
  redirect(`/dashboard/requirements?view=${encodeURIComponent(id)}`)
}
