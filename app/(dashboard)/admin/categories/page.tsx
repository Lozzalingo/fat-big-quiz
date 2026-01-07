import DashboardSingleCategory from "@/app/(dashboard)/admin/categories/CategoryList";

interface Props {
  params: { id: string };
}

export default function BlogCategoryPage({ params }: Props) {
  return <DashboardSingleCategory id={params.id} categoryType="PRODUCT" />;
}