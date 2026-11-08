import { getQuestions, postQuestion } from "@/lib/server/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => getQuestions(req);
export const POST = (req: Request) => postQuestion(req);
