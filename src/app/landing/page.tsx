
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Users, HelpCircle, Mail, Phone, LogIn, ChevronRight } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const eligibilityCriteria = [
  "Must be a full-time permanent employee of L1A Corp.",
  "Minimum of one (1) year of continuous service with the company.",
  "The requested training must be directly relevant to your current role or a clearly defined future role within L1A Corp.",
  "Requires initial approval from your direct supervisor/manager.",
  "Must not have any pending disciplinary actions.",
];

const faqs = [
  {
    question: "How long does the training approval process typically take?",
    answer: "Approval times can vary depending on the cost, complexity, and number of approval steps required. Generally, you can expect the process to take between 5 to 10 business days. Overseas training or high-cost programs may take longer due to additional approval layers.",
  },
  {
    question: "Is there a budget limit for training requests?",
    answer: "While there isn't a fixed universal limit per request, all training expenditures are subject to departmental budget availability and the overall company training budget. Requests are evaluated for their cost-effectiveness and alignment with strategic goals.",
  },
  {
    question: "Can I apply for overseas training programs?",
    answer: "Yes, overseas training is permissible if strongly justified. Such requests typically require additional information regarding the unique benefits of the overseas program compared to local alternatives and will require CEO-level approval.",
  },
  {
    question: "What kind of supporting documents do I need to submit?",
    answer: "Commonly required documents include the official course brochure or outline, a detailed cost breakdown (including any travel or accommodation if applicable), and information on any pre-requisites for the training.",
  },
  {
    question: "Who should I contact if I have more questions?",
    answer: "For specific questions about a training program or the application process, you can reach out to the HR Training Department using the contact details provided on this page.",
  },
];

const hrContact = {
  email: "hr-training@l1aapprove.com",
  phone: "(555) 123-4567",
  officeHours: "Monday - Friday, 9:00 AM - 5:00 PM (Local Time)",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col items-center justify-center p-4 sm:p-8">
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
        <Logo />
        <Button asChild variant="outline">
          <Link href="/login">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Link>
        </Button>
      </header>

      <main className="container mx-auto max-w-5xl space-y-12 mt-24 sm:mt-28 mb-12">
        <section className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-headline tracking-tight text-primary mb-6">
            Invest in Your Growth with L1A Approve
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Streamlining training requests and approvals to empower our employees.
            Discover eligibility, find answers to common questions, and get in touch with HR.
          </p>
          <Button size="lg" asChild>
            <Link href="/login">
              Get Started <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </section>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Image
            src="https://placehold.co/600x400.png"
            alt="Team collaborating on training"
            width={600}
            height={400}
            className="rounded-xl shadow-2xl object-cover aspect-[3/2]"
            data-ai-hint="team collaboration training"
          />
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-headline">Eligibility Criteria</CardTitle>
              </div>
              <CardDescription>
                Ensure you meet the following criteria before submitting a training request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground">
                {eligibilityCriteria.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <ChevronRight className="h-5 w-5 text-accent mr-2 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>


        <Card className="shadow-xl">
          <CardHeader>
             <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-full">
                  <HelpCircle className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-headline">Frequently Asked Questions (FAQs)</CardTitle>
              </div>
            <CardDescription>
              Find answers to common questions about the training request process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem value={"item-" + index} key={index}>
                  <AccordionTrigger className="text-left hover:no-underline text-base font-semibold">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pt-1 pb-3 text-sm">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
             <div className="flex items-center gap-3 mb-2">
                 <div className="p-3 bg-primary/10 rounded-full">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                <CardTitle className="text-2xl font-headline">HR Training Department Contact</CardTitle>
            </div>
            <CardDescription>
              For further assistance or specific queries regarding training programs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <a href={"mailto:" + hrContact.email} className="text-primary hover:underline">
                {hrContact.email}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">{hrContact.phone}</span>
            </div>
             <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">Office Hours: {hrContact.officeHours}</span>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="w-full text-center py-8 text-muted-foreground text-sm">
        &copy; {new Date().getFullYear()} L1A Approve. All rights reserved.
      </footer>
    </div>
  );
}
