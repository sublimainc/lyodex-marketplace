import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePageViews } from "@/hooks/usePageViews";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/Layout";
import Home from "@/pages/home";
import Operators from "@/pages/operators";
import OperatorProfile from "@/pages/operator-profile";
import CreateRequest from "@/pages/create-request";
import Requests from "@/pages/requests";
import RequestDetails from "@/pages/request-details";
import Dashboard from "@/pages/dashboard";
import OperatorListings from "@/pages/operator-listings";
import Shop from "@/pages/shop";
import Login from "@/pages/login";
import Register from "@/pages/register";
import HowItWorks from "@/pages/how-it-works";
import Pricing from "@/pages/pricing";
import AdminPanel from "@/pages/admin";
import Machinery from "@/pages/machinery";
import MachineryListingForm from "@/pages/machinery-listing-form";
import OperatorMap from "@/pages/operator-map";
import MarketIntelligence from "@/pages/market-intelligence";
import Seasonality from "@/pages/seasonality";
import Faq from "@/pages/faq";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import ProductMarket from "@/pages/product-market";
import ProductMarketDetail from "@/pages/product-market-detail";
import ProductMarketListForm from "@/pages/product-market-list";
import Trust from "@/pages/trust";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Settings from "@/pages/settings";
import Manufacturers from "@/pages/manufacturers";
import ManufacturerProfile from "@/pages/manufacturer-profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  // Records a page view on every route change. Without this the platform_events
  // table stayed empty and the admin panel had no traffic figures at all.
  usePageViews();

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/operators" component={Operators} />
        <Route path="/operators/:id" component={OperatorProfile} />
        <Route path="/request" component={CreateRequest} />
        <Route path="/requests" component={Requests} />
        <Route path="/requests/:id" component={RequestDetails} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/operator/listings" component={OperatorListings} />
        <Route path="/shop" component={Shop} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/machinery" component={Machinery} />
        <Route path="/machinery/list" component={MachineryListingForm} />
        <Route path="/operator-map" component={OperatorMap} />
        <Route path="/market-intelligence" component={MarketIntelligence} />
        <Route path="/seasonality" component={Seasonality} />
        <Route path="/faq" component={Faq} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/product-market/list" component={ProductMarketListForm} />
        <Route path="/product-market/:id" component={ProductMarketDetail} />
        <Route path="/product-market" component={ProductMarket} />
        <Route path="/trust" component={Trust} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/settings" component={Settings} />
        <Route path="/manufacturers" component={Manufacturers} />
        <Route path="/manufacturers/:slug" component={ManufacturerProfile} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
