import { Hero } from "@/components/hero";
import { RecruitForm } from "@/components/recruit-form";

/** The one page both "/" and "/apply" render. Build the form once, here. */
export function Landing() {
  return (
    <>
      <Hero />
      <RecruitForm />
    </>
  );
}
