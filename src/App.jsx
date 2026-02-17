
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from '@/context/AuthContext';
import { AppDataProvider } from '@/context/AppDataContext';

import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from '@/components/ScrollToTop';
import { Toaster } from '@/components/ui/toaster';

import useSupabaseInit from '@/hooks/useSupabaseInit';

/* =========================
   PUBLIC PAGES
========================= */
import PublicSearchPage from '@/pages/PublicSearchPage';
import NotFoundPage from '@/pages/NotFoundPage';
import CommunicationsPage from '@/pages/CommunicationsPage';

/* =========================
   ADMIN PAGES
========================= */
import AdminGeneralDashboard from '@/pages/admin/AdminGeneralDashboard';
import DioceseListPage from '@/pages/admin/DioceseListPage';
import ArchdioceseListPage from '@/pages/admin/ArchdioceseListPage';
import UserListPage from '@/pages/admin/UserListPage';
import UserManagementPage from '@/pages/admin/UserManagementPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import BackupPage from '@/pages/BackupPage';

/* =========================
   DIOCESE PAGES
========================= */
import DioceseUserDashboard from '@/pages/diocese/DioceseUserDashboard';
import DioceseEcclesiasticalPage from '@/pages/diocese/DioceseEcclesiasticalPage';
import DioceseSettingsPage from '@/pages/diocese/DioceseSettingsPage';
import ParishListPage from '@/pages/diocese/ParishListPage';

/* =========================
   PARISH PAGES
========================= */
import ParishDashboard from '@/pages/parish/ParishDashboard';
import ParroquiaAjustesPage from '@/pages/parish/ParroquiaAjustesPage';
import DatosAuxiliaresPage from '@/pages/parish/DatosAuxiliaresPage';
import ParishNotificationsPage from '@/pages/parish/ParishNotificationsPage';

/* --- BAPTISM --- */
import BaptismEditPage from '@/pages/parish/BaptismEditPage';
import BaptismNewPage from '@/pages/parish/BaptismNewPage';
import BaptismCelebratedPage from '@/pages/parish/BaptismCelebratedPage';
import BaptismSentarRegistrosPage from '@/pages/parish/BaptismSentarRegistrosPage';
import BaptismSeatIndividualPage from '@/pages/parish/BaptismSeatIndividualPage';
import BaptismSeatBatchPage from '@/pages/parish/BaptismSeatBatchPage';
import BaptismPartidasPage from '@/pages/parish/BaptismPartidasPage';
import BaptismParametersPage from '@/pages/parish/BaptismParametersPage';
import BaptismIndexPage from '@/pages/parish/BaptismIndexPage';

/* --- CONFIRMATION --- */
import ConfirmationNewPage from '@/pages/parish/ConfirmationNewPage';
import ConfirmationCelebratedPage from '@/pages/parish/ConfirmationCelebratedPage';
import ConfirmationSentarRegistrosPage from '@/pages/parish/ConfirmationSentarRegistrosPage';
import ConfirmationEditPage from '@/pages/parish/ConfirmationEditPage';
import ConfirmationPartidasPage from '@/pages/parish/ConfirmationPartidasPage';
import ConfirmationIndexPage from '@/pages/parish/ConfirmationIndexPage';
import ConfirmationParametersPage from '@/pages/parish/ConfirmationParametersPage';

/* --- MATRIMONIO --- */
import MatrimonioNewPage from '@/pages/parish/MatrimonioNewPage';
import MatrimonioCelebratedPage from '@/pages/parish/MatrimonioCelebratedPage';
import MatrimonioSentarRegistrosPage from '@/pages/parish/MatrimonioSentarRegistrosPage';
import MatrimonioSeatIndividualPage from '@/pages/parish/MatrimonioSeatIndividualPage';
import MatrimonioSeatBatchPage from '@/pages/parish/MatrimonioSeatBatchPage';
import MatrimonioPartidasPage from '@/pages/parish/MatrimonioPartidasPage';
import MarriageIndexPage from '@/pages/parish/MarriageIndexPage';
import MatrimonioParametersPage from '@/pages/parish/MatrimonioParametersPage';
import MatrimonioEditPage from '@/pages/parish/MatrimonioEditPage';

/* --- DECREES (Reposición) --- */
import NewDecreeReplacement from '@/pages/parish/NewDecreeReplacement';
import DecreeReplacementView from '@/pages/parish/DecreeReplacementView';
import EditDecreeReplacement from '@/pages/parish/EditDecreeReplacement';
import EditDecreeReplacementSheet from '@/pages/parish/EditDecreeReplacementSheet';
import DecreeRepositionNew from '@/pages/parish/DecreeRepositionNew';
import BaptismRepositionNewPage from '@/pages/parish/BaptismRepositionNewPage';

/* --- DECREES (Corrección) --- */
import BaptismCorrectionNewPage from '@/pages/parish/BaptismCorrectionNewPage';
import BaptismCorrectionListPage from '@/pages/parish/BaptismCorrectionListPage';
import EditDecreeCorrectionSheet from '@/pages/parish/EditDecreeCorrectionSheet';

/* --- ANNULMENT CONCEPTS --- */
import AnnulmentConceptsPage from '@/pages/parish/AnnulmentConceptsPage';

/* --- NEW PARISH PAGES (Placeholder) --- */
import AnnulmentMatrimonialPage from '@/pages/parish/AnnulmentMatrimonialPage';
import MatrimonialNotificationPage from '@/pages/parish/MatrimonialNotificationPage';
import NotificationWarningPage from '@/pages/parish/NotificationWarningPage';


/* =========================
   OTHER SACRAMENTS
========================= */
import MarriagePage from '@/pages/sacraments/MarriagePage';

/* =========================
   CHANCERY
========================= */
import ChanceryDashboard from '@/pages/chancery/ChanceryDashboard';
import ChanceryCorrectionDecreeListPage from '@/pages/chancery/ChanceryCorrectionDecreeListPage';
import ChanceryReplacementDecreeListPage from '@/pages/chancery/ChanceryReplacementDecreeListPage';

/* --- CHANCERY DECREES --- */
import NewDecreeCorrectionPage from '@/pages/chancery/decree-correction/NewDecreeCorrectionPage';
import NewDecreeReplacementPage from '@/pages/chancery/decree-replacement/NewDecreeReplacementPage';
import ChanceryAnnulmentConceptsPage from '@/pages/chancery/decree-annulment/AnnulmentConceptsPage';

// NEW CHANCERY COMPONENTS
import ChanceryDecreeReplacementViewPage from '@/pages/chancery/ChanceryDecreeReplacementViewPage.jsx';
import ChanceryDecreeCorrectionViewPage from '@/pages/chancery/ChanceryDecreeCorrectionViewPage.jsx';
import ChanceryDecreeReplacementEditPage from '@/pages/chancery/ChanceryDecreeReplacementEditPage.jsx';
import ChanceryDecreeCorrectionEditPage from '@/pages/chancery/ChanceryDecreeCorrectionEditPage.jsx';

/* =========================
   DEBUG
========================= */
import DebugAuthPage from '@/pages/DebugAuthPage';

/* =========================
   APP ROUTES
========================= */
const AppContent = () => {
    // Inicializa Supabase solo si hay credenciales
    useSupabaseInit();

    return (
        <>
            <ScrollToTop />

            <Routes>
                {/* -------- PUBLIC -------- */}
                <Route path="/" element={<PublicSearchPage />} />

                {/* -------- DEBUG -------- */}
                <Route path="/debug-auth" element={<ProtectedRoute><DebugAuthPage /></ProtectedRoute>} />

                {/* -------- ADMIN -------- */}
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedRoute requiredRole="admin_general">
                            <AdminGeneralDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route path="/admin/dioceses" element={<ProtectedRoute requiredRole="admin_general"><DioceseListPage /></ProtectedRoute>} />
                <Route path="/admin/archdioceses" element={<ProtectedRoute requiredRole="admin_general"><ArchdioceseListPage /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin_general"><UserListPage /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin_general"><SettingsPage /></ProtectedRoute>} />

                <Route
                    path="/admin/users/diocese"
                    element={
                        <ProtectedRoute requiredRole="admin_general">
                            <UserManagementPage
                                roleToManage="diocese"
                                title="Gestión de Usuarios Diocesanos"
                            />
                        </ProtectedRoute>
                    }
                />

                {/* -------- DIOCESE -------- */}
                <Route path="/diocese/dashboard" element={<ProtectedRoute requiredRole="diocese"><DioceseUserDashboard /></ProtectedRoute>} />
                <Route path="/diocese/ecclesiastical" element={<ProtectedRoute requiredRole="diocese"><DioceseEcclesiasticalPage /></ProtectedRoute>} />
                <Route path="/diocese/settings" element={<ProtectedRoute requiredRole="diocese"><DioceseSettingsPage /></ProtectedRoute>} />
                <Route path="/diocese/parishes" element={<ProtectedRoute requiredRole="diocese"><ParishListPage /></ProtectedRoute>} />

                {/* -------- PARISH -------- */}
                <Route path="/parish/dashboard" element={<ProtectedRoute requiredRole="parish"><ParishDashboard /></ProtectedRoute>} />
                <Route path="/parish/notifications" element={<ProtectedRoute requiredRole="parish"><ParishNotificationsPage /></ProtectedRoute>} />
                <Route path="/parroquia/ajustes" element={<ProtectedRoute requiredRole="parish"><ParroquiaAjustesPage /></ProtectedRoute>} />

                {/* Bautismo Routes */}
                <Route path="/parroquia/bautismo/editar" element={<ProtectedRoute requiredRole="parish"><BaptismEditPage /></ProtectedRoute>} />
                <Route path="/parroquia/bautismo/nuevo" element={<ProtectedRoute requiredRole="parish"><BaptismNewPage /></ProtectedRoute>} />
                <Route path="/parroquia/bautismo/celebrado" element={<ProtectedRoute requiredRole="parish"><BaptismCelebratedPage /></ProtectedRoute>} />

                <Route path="/parroquia/bautismo/sentar-registros" element={<ProtectedRoute requiredRole="parish"><BaptismSentarRegistrosPage /></ProtectedRoute>} />
                <Route path="/parroquia/bautismo/sentar-registros/individual" element={<ProtectedRoute requiredRole="parish"><BaptismSeatIndividualPage /></ProtectedRoute>} />
                <Route path="/parroquia/bautismo/sentar-registros/lote" element={<ProtectedRoute requiredRole="parish"><BaptismSeatBatchPage /></ProtectedRoute>} />

                <Route path="/parroquia/bautismo/partidas" element={<ProtectedRoute requiredRole="parish"><BaptismPartidasPage /></ProtectedRoute>} />
                <Route path="/parroquia/bautismo/indice" element={<ProtectedRoute requiredRole="parish"><BaptismIndexPage /></ProtectedRoute>} />
                <Route path="/parroquia/bautismo/parametros" element={<ProtectedRoute requiredRole="parish"><BaptismParametersPage /></ProtectedRoute>} />
                <Route path="/parroquia/parametros" element={<ProtectedRoute requiredRole="parish"><BaptismParametersPage /></ProtectedRoute>} /> {/* Fallback/Legacy */}
                
                {/* Confirmación Routes */}
                <Route path="/parroquia/confirmacion/nuevo" element={<ProtectedRoute requiredRole="parish"><ConfirmationNewPage /></ProtectedRoute>} />
                <Route path="/parroquia/confirmacion/celebrado" element={<ProtectedRoute requiredRole="parish"><ConfirmationCelebratedPage /></ProtectedRoute>} />
                <Route path="/parroquia/confirmacion/sentar-registros" element={<ProtectedRoute requiredRole="parish"><ConfirmationSentarRegistrosPage /></ProtectedRoute>} />
                <Route path="/parroquia/confirmacion/editar" element={<ProtectedRoute requiredRole="parish"><ConfirmationEditPage /></ProtectedRoute>} />
                <Route path="/parroquia/confirmacion/partidas" element={<ProtectedRoute requiredRole="parish"><ConfirmationPartidasPage /></ProtectedRoute>} />
                <Route path="/parroquia/confirmacion/indice" element={<ProtectedRoute requiredRole="parish"><ConfirmationIndexPage /></ProtectedRoute>} />
                <Route path="/parroquia/confirmacion/parametros" element={<ProtectedRoute requiredRole="parish"><ConfirmationParametersPage /></ProtectedRoute>} />

                {/* Matrimonio Routes */}
                <Route path="/parroquia/matrimonio/nuevo" element={<ProtectedRoute requiredRole="parish"><MatrimonioNewPage /></ProtectedRoute>} />
                <Route path="/parroquia/matrimonio/celebrado" element={<ProtectedRoute requiredRole="parish"><MatrimonioCelebratedPage /></ProtectedRoute>} />
                <Route path="/parroquia/matrimonio/sentar-registros" element={<ProtectedRoute requiredRole="parish"><MatrimonioSentarRegistrosPage /></ProtectedRoute>} />
                <Route path="/parroquia/matrimonio/sentar-registros/individual" element={<ProtectedRoute requiredRole="parish"><MatrimonioSeatIndividualPage /></ProtectedRoute>} />
                <Route path="/parroquia/matrimonio/sentar-registros/lote" element={<ProtectedRoute requiredRole="parish"><MatrimonioSeatBatchPage /></ProtectedRoute>} />
                <Route path="/parroquia/matrimonio/partidas" element={<ProtectedRoute requiredRole="parish"><MatrimonioPartidasPage /></ProtectedRoute>} />
                <Route path="/parroquia/matrimonio/indice" element={<ProtectedRoute requiredRole="parish"><MarriageIndexPage /></ProtectedRoute>} />
                <Route path="/parroquia/matrimonio/parametros" element={<ProtectedRoute requiredRole="parish"><MatrimonioParametersPage /></ProtectedRoute>} />
                <Route path="/parroquia/matrimonio/editar" element={<ProtectedRoute requiredRole="parish"><MatrimonioEditPage /></ProtectedRoute>} />
                <Route path="/parroquia/matrimonio/notificacion" element={<ProtectedRoute requiredRole="parish"><MatrimonialNotificationPage /></ProtectedRoute>} />

                {/* Decrees Routes (Updated Structure) */}
                <Route path="/parish/decree-replacement/new" element={<ProtectedRoute requiredRole="parish"><NewDecreeReplacement /></ProtectedRoute>} />
                <Route path="/parish/decree-correction/new" element={<ProtectedRoute requiredRole="parish"><BaptismCorrectionNewPage /></ProtectedRoute>} />
                
                {/* NEW REPOSITION ROUTES */}
                <Route path="/parish/new-decree-reposition" element={<ProtectedRoute requiredRole="parish"><DecreeRepositionNew /></ProtectedRoute>} />
                <Route path="/parish/baptism-reposition-new" element={<ProtectedRoute requiredRole="parish"><BaptismRepositionNewPage /></ProtectedRoute>} />

                <Route path="/parish/decree-replacement/view" element={<ProtectedRoute requiredRole="parish"><DecreeReplacementView /></ProtectedRoute>} />
                <Route path="/parish/decree-correction/view" element={<ProtectedRoute requiredRole="parish"><BaptismCorrectionListPage /></ProtectedRoute>} />
                
                <Route path="/parish/decree-replacement/edit" element={<ProtectedRoute requiredRole="parish"><EditDecreeReplacementSheet /></ProtectedRoute>} />
                <Route path="/parish/decree-correction/edit" element={<ProtectedRoute requiredRole="parish"><EditDecreeCorrectionSheet /></ProtectedRoute>} />
                
                {/* Legacy Routes Support (Optional - kept for safety if external links exist) */}
                <Route path="/parroquia/decretos/nuevo-reposicion" element={<ProtectedRoute requiredRole="parish"><NewDecreeReplacement /></ProtectedRoute>} />
                <Route path="/parroquia/decretos/reposicion" element={<ProtectedRoute requiredRole="parish"><DecreeReplacementView /></ProtectedRoute>} />
                <Route path="/parroquia/decretos/editar-reposicion" element={<ProtectedRoute requiredRole="parish"><EditDecreeReplacement /></ProtectedRoute>} />
                <Route path="/parroquia/decretos/editar-reposicion-hoja" element={<ProtectedRoute requiredRole="parish"><EditDecreeReplacementSheet /></ProtectedRoute>} />

                <Route path="/parroquia/decretos/nuevo-correccion" element={<ProtectedRoute requiredRole="parish"><BaptismCorrectionNewPage /></ProtectedRoute>} />
                <Route path="/parroquia/decretos/ver-correcciones" element={<ProtectedRoute requiredRole="parish"><BaptismCorrectionListPage /></ProtectedRoute>} />
                <Route path="/parroquia/decretos/editar-correccion" element={<ProtectedRoute requiredRole="parish"><EditDecreeCorrectionSheet /></ProtectedRoute>} />
                <Route path="/parroquia/decretos/nulidad" element={<ProtectedRoute requiredRole="parish"><AnnulmentMatrimonialPage /></ProtectedRoute>} />

                {/* Annulment Concepts */}
                <Route path="/parish/annulment-concepts" element={<ProtectedRoute requiredRole="parish"><AnnulmentConceptsPage /></ProtectedRoute>} />

                <Route path="/datos-auxiliares" element={<ProtectedRoute requiredRole="parish"><DatosAuxiliaresPage /></ProtectedRoute>} />
                <Route path="/parroquia/aviso-notificacion" element={<ProtectedRoute requiredRole="parish"><NotificationWarningPage /></ProtectedRoute>} />


                {/* -------- OTHER SACRAMENTS -------- */}
                <Route path="/sacraments/marriage/*" element={<ProtectedRoute requiredRole="parish"><MarriagePage /></ProtectedRoute>} />

                {/* -------- CHANCERY -------- */}
                <Route path="/chancery/dashboard" element={<ProtectedRoute requiredRole="chancery"><ChanceryDashboard /></ProtectedRoute>} />
                <Route path="/chancery/pending" element={<ProtectedRoute requiredRole="chancery"><ChanceryDashboard /></ProtectedRoute>} />
                <Route path="/chancery/certifications" element={<ProtectedRoute requiredRole="chancery"><ChanceryDashboard /></ProtectedRoute>} />
                <Route path="/chancery/backups" element={<ProtectedRoute requiredRole="chancery"><BackupPage /></ProtectedRoute>} />

                {/* CHANCERY DECREES - Main List Pages */}
                <Route path="/chancery/decretos/correcciones" element={<ProtectedRoute requiredRole="chancery"><ChanceryDecreeCorrectionViewPage /></ProtectedRoute>} />
                <Route path="/chancery/decretos/reposiciones" element={<ProtectedRoute requiredRole="chancery"><ChanceryDecreeReplacementViewPage /></ProtectedRoute>} />

                {/* CHANCERY DECREES - CORRECTIONS */}
                <Route path="/chancery/decree-correction/new" element={<ProtectedRoute requiredRole="chancery"><NewDecreeCorrectionPage /></ProtectedRoute>} />
                <Route path="/chancery/decree-correction" element={<ProtectedRoute requiredRole="chancery"><ChanceryDecreeCorrectionViewPage /></ProtectedRoute>} />
                
                {/* NEW CHANCERY VIEW/EDIT ROUTES (As requested) */}
                <Route path="/chancery/decree-replacement/view" element={<ProtectedRoute requiredRole="chancery"><ChanceryDecreeReplacementViewPage /></ProtectedRoute>} />
                <Route path="/chancery/decree-correction/view" element={<ProtectedRoute requiredRole="chancery"><ChanceryDecreeCorrectionViewPage /></ProtectedRoute>} />
                <Route path="/chancery/decree-replacement/edit" element={<ProtectedRoute requiredRole="chancery"><ChanceryDecreeReplacementEditPage /></ProtectedRoute>} />
                <Route path="/chancery/decree-correction/edit" element={<ProtectedRoute requiredRole="chancery"><ChanceryDecreeCorrectionEditPage /></ProtectedRoute>} />
                
                {/* CHANCERY DECREES - REPLACEMENTS */}
                <Route path="/chancery/decree-replacement/new" element={<ProtectedRoute requiredRole="chancery"><NewDecreeReplacementPage /></ProtectedRoute>} />
                <Route path="/chancery/decree-replacement" element={<ProtectedRoute requiredRole="chancery"><ChanceryDecreeReplacementViewPage /></ProtectedRoute>} />
                
                {/* Decree Annulment Concepts */}
                <Route path="/chancery/decree-annulment" element={<ProtectedRoute requiredRole="chancery"><ChanceryAnnulmentConceptsPage /></ProtectedRoute>} />

                {/* Legacy / Maintenance Routes */}
                <Route path="/chancery/decree-correction/list" element={<ProtectedRoute requiredRole="chancery"><ChanceryCorrectionDecreeListPage /></ProtectedRoute>} />
                <Route path="/chancery/decree-replacement/list" element={<ProtectedRoute requiredRole="chancery"><ChanceryReplacementDecreeListPage /></ProtectedRoute>} />
                
                {/* -------- SHARED -------- */}
                <Route path="/communications" element={<ProtectedRoute><CommunicationsPage /></ProtectedRoute>} />

                {/* -------- ERRORS -------- */}
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>

            <Toaster />
        </>
    );
};

/* =========================
   ROOT APP
========================= */
export default function App() {
    return (
        <Router>
            <AppDataProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </AppDataProvider>
        </Router>
    );
}
