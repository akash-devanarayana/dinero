// Bundle entry — imports the app scripts in their original load order.
// Each file communicates through window globals (no exports), so order matters:
// it mirrors the former <script type="text/babel"> sequence in Dinero.html.
import "./tweaks-panel.jsx";
import "./data.jsx";
import "./dinero-icons.jsx";
import "./dinero-motion.jsx";
import "./dinero-modals.jsx";
import "./dinero-sidebar.jsx";
import "./dinero-main.jsx";
import "./dinero-filter.jsx";
import "./dinero-admin.jsx";
import "./dinero-app.jsx";
