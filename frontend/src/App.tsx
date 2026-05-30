import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/home";
import NotFound from "./pages/not-found";
import YouTubeTool from "./pages/tools/youtube";
import FacebookTool from "./pages/tools/facebook";
import InstagramTool from "./pages/tools/instagram";
import TranscriptTool from "./pages/tools/transcript";
import SummarizerTool from "./pages/tools/summarizer";
import BgRemoverTool from "./pages/tools/bgremover";
import NotesTool from "./pages/tools/notes";
import TodoTool from "./pages/tools/todo";
import ConverterTool from "./pages/tools/converter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tools/youtube" component={YouTubeTool} />
      <Route path="/tools/facebook" component={FacebookTool} />
      <Route path="/tools/instagram" component={InstagramTool} />
      <Route path="/tools/transcript" component={TranscriptTool} />
      <Route path="/tools/summarizer" component={SummarizerTool} />
      <Route path="/tools/bgremover" component={BgRemoverTool} />
      <Route path="/tools/notes" component={NotesTool} />
      <Route path="/tools/todo" component={TodoTool} />
      <Route path="/tools/converter" component={ConverterTool} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
