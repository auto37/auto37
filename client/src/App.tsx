import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "./context/SidebarContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/layout/Layout";
import { OfflineIndicator } from "./components/ui/offline-indicator";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/customers/Customers";
import CustomerForm from "./pages/customers/CustomerForm";
import CustomerDetails from "./pages/customers/CustomerDetails";
import Inventory from "./pages/inventory/Inventory";
import InventoryForm from "./pages/inventory/InventoryForm";
import CategoryForm from "./pages/inventory/CategoryForm";
import Services from "./pages/services/Services";
import ServiceForm from "./pages/services/ServiceForm";
import Quotes from "./pages/quotes/Quotes";
import QuoteForm from "./pages/quotes/QuoteForm";
import QuoteDetails from "./pages/quotes/QuoteDetails";
import Repairs from "./pages/repairs/Repairs";
import RepairForm from "./pages/repairs/RepairForm";
import RepairDetails from "./pages/repairs/RepairDetails";
import Invoices from "./pages/invoices/Invoices";
import InvoiceForm from "./pages/invoices/InvoiceForm";
import InvoiceDetails from "./pages/invoices/InvoiceDetails";
import Reports from "./pages/reports/Reports";
import Settings from "./pages/settings/Settings";
import InvoicePrint from "./pages/print/InvoicePrint";
import QuotePrint from "./pages/print/QuotePrint";
import RepairPrint from "./pages/print/RepairPrint";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <SidebarProvider>
      <ToastProvider>
        <TooltipProvider>
          <Toaster />
          <OfflineIndicator />
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              
              <Route path="/customers" component={Customers} />
              <Route path="/customers/new" component={CustomerForm} />
              <Route path="/customers/:id/edit" component={CustomerForm} />
              <Route path="/customers/:id" component={CustomerDetails} />
              
              <Route path="/inventory" component={Inventory} />
              <Route path="/inventory/new" component={InventoryForm} />
              <Route path="/inventory/:id/edit" component={InventoryForm} />
              <Route path="/inventory/category/new" component={CategoryForm} />
              <Route path="/inventory/category/:id/edit" component={CategoryForm} />
              
              <Route path="/services" component={Services} />
              <Route path="/services/new" component={ServiceForm} />
              <Route path="/services/:id/edit" component={ServiceForm} />
              
              <Route path="/quotes" component={Quotes} />
              <Route path="/quotes/new" component={QuoteForm} />
              <Route path="/quotes/:id/edit" component={QuoteForm} />
              <Route path="/quotes/:id" component={QuoteDetails} />
              
              <Route path="/repairs" component={Repairs} />
              <Route path="/repairs/new" component={RepairForm} />
              <Route path="/repairs/from-quote/:quoteId" component={RepairForm} />
              <Route path="/repairs/:id/edit" component={RepairForm} />
              <Route path="/repairs/:id" component={RepairDetails} />
              
              <Route path="/invoices" component={Invoices} />
              <Route path="/invoices/new" component={InvoiceForm} />
              <Route path="/invoices/from-repair/:repairId" component={InvoiceForm} />
              <Route path="/invoices/:id/edit" component={InvoiceForm} />
              <Route path="/invoices/:id" component={InvoiceDetails} />
              
              <Route path="/reports" component={Reports} />
              
              <Route path="/settings" component={Settings} />
              
              <Route path="/print/invoice/:id" component={InvoicePrint} />
              <Route path="/print/quote/:id" component={QuotePrint} />
              <Route path="/print/repair/:id" component={RepairPrint} />
              
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </TooltipProvider>
      </ToastProvider>
    </SidebarProvider>
  );
}

export default App;
