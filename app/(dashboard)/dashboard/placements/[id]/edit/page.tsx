import { redirect } from 'next/navigation'

interface PlacementEditPageProps {
  params: Promise<{ id: string }>
}

export default async function PlacementEditPage({ params }: Readonly<PlacementEditPageProps>) {
  const { id } = await params
  redirect(`/dashboard/placements/${id}?edit=1`)
}
