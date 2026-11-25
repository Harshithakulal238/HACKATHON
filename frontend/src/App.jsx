import { Navigate, Route, Routes } from "react-router-dom";
import VisitorHeader from "./components/layout/VisitorHeader";
import CuratorLayout from "./components/layout/CuratorLayout";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import CuratorDashboard from "./pages/curator/Dashboard";
import MuseumManagement from "./pages/curator/MuseumManagement";
import ExhibitManagement from "./pages/curator/ExhibitManagement";
import GalleryManagement from "./pages/curator/GalleryManagement";
import FloorMapEditor from "./pages/curator/FloorMapEditor";
import QRManagement from "./pages/curator/QRManagement";
import Analytics from "./pages/curator/Analytics";
import WorkerDashboard from "./pages/worker/Dashboard";
import VisitorRegistration from "./pages/worker/VisitorRegistration";
import InterestSelection from "./pages/worker/InterestSelection";
import TimeAllocation from "./pages/worker/TimeAllocation";
import TicketGeneration from "./pages/worker/TicketGeneration";
import VisitorWelcome from "./pages/visitor/VisitorWelcome";
import ScanRouteQR from "./pages/visitor/ScanRouteQR";
import TourDashboard from "./pages/visitor/TourDashboard";
import MuseumMap from "./pages/visitor/MuseumMap";
import ExhibitDetails from "./pages/visitor/ExhibitDetails";
import AudioGuide from "./pages/visitor/AudioGuide";
import Feedback from "./pages/visitor/Feedback";
import SessionExtension from "./pages/visitor/SessionExtension";
import TourCompletion from "./pages/visitor/TourCompletion";

function VisitorShell({ children, back = false }) {
  return (
    <div className="visitor-shell">
      <VisitorHeader back={back} />
      <main className="visitor-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<VisitorShell><VisitorWelcome /></VisitorShell>} />
      <Route path="/auth/sign-in" element={<SignIn />} />
      <Route path="/auth/sign-up" element={<SignUp />} />

      <Route path="/visitor/scan" element={<VisitorShell back><ScanRouteQR /></VisitorShell>} />
      <Route path="/visitor/tour/:sessionId?" element={<VisitorShell back><TourDashboard /></VisitorShell>} />
      <Route path="/visitor/map/:sessionId?" element={<VisitorShell back><MuseumMap /></VisitorShell>} />
      <Route path="/visitor/exhibit/:exhibitId" element={<VisitorShell back><ExhibitDetails /></VisitorShell>} />
      <Route path="/visitor/audio/:exhibitId" element={<VisitorShell back><AudioGuide /></VisitorShell>} />
      <Route path="/visitor/feedback/:exhibitId" element={<VisitorShell back><Feedback /></VisitorShell>} />
      <Route path="/visitor/extension/:sessionId?" element={<VisitorShell back><SessionExtension /></VisitorShell>} />
      <Route path="/visitor/complete/:sessionId?" element={<VisitorShell back><TourCompletion /></VisitorShell>} />

      <Route path="/worker" element={<VisitorShell back><WorkerDashboard /></VisitorShell>} />
      <Route path="/worker/register" element={<VisitorShell back><VisitorRegistration /></VisitorShell>} />
      <Route path="/worker/interests/:visitorId" element={<VisitorShell back><InterestSelection /></VisitorShell>} />
      <Route path="/worker/time/:visitorId" element={<VisitorShell back><TimeAllocation /></VisitorShell>} />
      <Route path="/worker/ticket/:sessionId" element={<VisitorShell back><TicketGeneration /></VisitorShell>} />

      <Route path="/curator" element={<CuratorLayout />}>
        <Route index element={<CuratorDashboard />} />
        <Route path="museum" element={<MuseumManagement />} />
        <Route path="galleries" element={<GalleryManagement />} />
        <Route path="exhibits" element={<ExhibitManagement />} />
        <Route path="floorplan" element={<FloorMapEditor />} />
        <Route path="qr" element={<QRManagement />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}