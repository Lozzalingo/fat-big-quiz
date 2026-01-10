import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ search?: string }>;
}

// Redirect search page to shop with search parameter
const SearchPage = async ({ searchParams }: Props) => {
  const { search } = await searchParams;

  if (search) {
    redirect(`/shop?search=${encodeURIComponent(search)}`);
  } else {
    redirect("/shop");
  }
};

export default SearchPage;
