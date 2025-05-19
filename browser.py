import sys
import os
from PyQt5.QtCore import QUrl, Qt, QSize, QDateTime, QMetaObject, pyqtSlot, Q_ARG
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QToolBar, QAction, QLineEdit, QStatusBar,
    QDialog, QVBoxLayout, QHBoxLayout, QListWidget, QPushButton, QDialogButtonBox,
    QMessageBox, QStyle, QLabel
)
from PyQt5.QtGui import QIcon, QFont # Added QFont
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage

# --- Configuration ---
WHITELIST_FILE = "whitelist.txt"
BLACKLIST_FILE = "blacklist.txt"
LOG_FILE = "browser_activity.log"
DEFAULT_HOME_URL = "https://play.imaginea.store"
APP_NAME = "Imaginea Secure Browser"
APP_ICON_PATH = "icons/app_icon.png" # Ensure this icon exists in 'icons' folder

# --- Icon Paths (relative to the script location) ---
ICON_FOLDER = "icons"
ICON_BACK = os.path.join(ICON_FOLDER, "back.png")
ICON_FORWARD = os.path.join(ICON_FOLDER, "forward.png")
ICON_RELOAD = os.path.join(ICON_FOLDER, "reload.png")
ICON_HOME = os.path.join(ICON_FOLDER, "home.png")
ICON_STOP = os.path.join(ICON_FOLDER, "stop.png")
ICON_EXIT = os.path.join(ICON_FOLDER, "exit.png")
ICON_WHITELIST = os.path.join(ICON_FOLDER, "whitelist.png")
ICON_BLACKLIST = os.path.join(ICON_FOLDER, "blacklist.png")
ICON_ADD = os.path.join(ICON_FOLDER, "add.png")
ICON_REMOVE = os.path.join(ICON_FOLDER, "remove.png")


# --- Global Stylesheet (QSS) ---
# You can customize this extensively. This is a sample dark theme.
STYLESHEET = """
    QMainWindow {
        background-color: #2E3440; /* Nord Polar Night */
    }
    QDialog {
        background-color: #3B4252; /* Nord Polar Night slightly lighter */
        border: 1px solid #4C566A;
    }
    QLabel {
        color: #D8DEE9; /* Nord Snow Storm */
        font-size: 10pt;
    }
    QLineEdit {
        background-color: #4C566A; /* Nord Frost/Polar darker */
        color: #ECEFF4; /* Nord Snow Storm light */
        border: 1px solid #3B4252;
        border-radius: 4px;
        padding: 5px;
        font-size: 10pt;
    }
    QLineEdit:focus {
        border: 1px solid #88C0D0; /* Nord Frost light blue */
    }
    QPushButton {
        background-color: #5E81AC; /* Nord Frost blue */
        color: #ECEFF4;
        border: none;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 10pt;
        min-width: 80px;
    }
    QPushButton:hover {
        background-color: #81A1C1; /* Nord Frost lighter blue */
    }
    QPushButton:pressed {
        background-color: #4C566A;
    }
    QToolBar {
        background-color: #3B4252; /* Nord Polar Night */
        border: none;
        padding: 2px;
        spacing: 5px; /* Spacing between items */
    }
    QToolBar QToolButton { /* Style for toolbar buttons (QActions become QToolButtons) */
        background-color: transparent;
        border: none;
        padding: 4px;
        margin: 2px;
        border-radius: 4px;
    }
    QToolBar QToolButton:hover {
        background-color: #4C566A; /* Nord Frost/Polar darker for hover */
    }
    QToolBar QToolButton:pressed {
        background-color: #434C5E;
    }
    QStatusBar {
        background-color: #3B4252;
        color: #D8DEE9;
        font-size: 9pt;
    }
    QStatusBar::item {
        border: none; /* Remove border for status bar items */
    }
    QMenuBar {
        background-color: #3B4252;
        color: #D8DEE9;
        font-size: 10pt;
    }
    QMenuBar::item {
        background-color: transparent;
        padding: 4px 10px;
    }
    QMenuBar::item:selected { /* When hovered */
        background-color: #4C566A;
    }
    QMenu {
        background-color: #3B4252;
        color: #D8DEE9;
        border: 1px solid #4C566A;
        font-size: 10pt;
    }
    QMenu::item {
        padding: 5px 20px 5px 20px;
    }
    QMenu::item:selected {
        background-color: #5E81AC;
        color: #ECEFF4;
    }
    QMenu::separator {
        height: 1px;
        background-color: #4C566A;
        margin-left: 5px;
        margin-right: 5px;
    }
    QListWidget {
        background-color: #434C5E; /* Nord Polar Night medium */
        color: #D8DEE9;
        border: 1px solid #4C566A;
        border-radius: 4px;
        font-size: 10pt;
        alternate-background-color: #4C566A; /* For alternating row colors */
    }
    QListWidget::item {
        padding: 5px;
    }
    QListWidget::item:selected {
        background-color: #5E81AC; /* Nord Frost blue */
        color: #ECEFF4;
        border-radius: 2px; /* Slight rounding for selected item */
    }
    QMessageBox {
        background-color: #3B4252;
    }
    QMessageBox QLabel { /* For text inside QMessageBox */
        color: #D8DEE9;
        font-size: 10pt;
    }
    /* You might need to style QMessageBox buttons specifically if the general QPushButton style doesn't cover them well enough */
"""


# --- Logging ---
def log_event(event_type, message):
    timestamp = QDateTime.currentDateTime().toString("yyyy-MM-dd hh:mm:ss.zzz")
    log_entry = f"[{timestamp}] [{event_type.ljust(20)}] {message}\n"
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(log_entry)
    except IOError as e:
        print(f"Error writing to log file {LOG_FILE}: {e}")

# --- Custom Web Engine Page for Whitelist/Blacklist ---
class CustomWebEnginePage(QWebEnginePage):
    def __init__(self, parent_window, whitelist, blacklist):
        super().__init__(parent_window)
        self.parent_window = parent_window
        self.whitelist = whitelist
        self.blacklist = blacklist

    def acceptNavigationRequest(self, url, _type, isMainFrame):
        url_str = url.toString()
        url_str_lower = url_str.lower()
        
        log_event("NAVIGATION_REQUEST", f"URL: {url_str}, Type: {_type}, MainFrame: {isMainFrame}")

        if any(b_url in url_str_lower for b_url in self.blacklist):
            log_event("NAVIGATION_BLOCKED", f"Blacklisted: {url_str}")
            QMetaObject.invokeMethod(self.parent_window, "show_blocked_message_slot", Qt.QueuedConnection,
                                     Q_ARG(str, url_str), Q_ARG(str, "URL is blacklisted."))
            return False

        if self.whitelist:
            if any(w_url in url_str_lower for w_url in self.whitelist):
                log_event("NAVIGATION_ALLOWED", f"Whitelisted: {url_str}")
                return True
            else:
                log_event("NAVIGATION_BLOCKED", f"Not in whitelist (active): {url_str}")
                QMetaObject.invokeMethod(self.parent_window, "show_blocked_message_slot", Qt.QueuedConnection,
                                     Q_ARG(str, url_str), Q_ARG(str, "URL not in whitelist."))
                return False
        
        log_event("NAVIGATION_ALLOWED", f"Default (no active whitelist, not blacklisted): {url_str}")
        return True

# --- URL List Management Dialog ---
class UrlListDialog(QDialog):
    def __init__(self, current_urls, dialog_title, parent=None):
        super().__init__(parent)
        self.setWindowTitle(dialog_title)
        self.setMinimumSize(500, 400) # Slightly larger for better spacing
        self.urls_modified = False

        self.layout = QVBoxLayout(self)
        self.layout.setSpacing(10) # Add some spacing between widgets
        self.layout.setContentsMargins(15, 15, 15, 15) # Add padding around the dialog

        self.info_label = QLabel("Enter domain (e.g., example.com) or full URL.\nMatching is case-insensitive and checks for substrings.")
        self.layout.addWidget(self.info_label)

        self.list_widget = QListWidget()
        if current_urls:
            self.list_widget.addItems(current_urls)
        self.layout.addWidget(self.list_widget)

        input_area_layout = QHBoxLayout()
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("e.g., imaginea.store or https://specific.page.com")
        self.add_button = QPushButton("Add")
        if os.path.exists(ICON_ADD):
            self.add_button.setIcon(QIcon(ICON_ADD))
        else: # Fallback if icon is missing
            self.add_button.setIcon(self.style().standardIcon(QStyle.SP_DialogApplyButton))
            print(f"Warning: Icon not found at {ICON_ADD}")
        self.add_button.clicked.connect(self.add_url)
        input_area_layout.addWidget(self.url_input)
        input_area_layout.addWidget(self.add_button)
        self.layout.addLayout(input_area_layout)

        self.remove_button = QPushButton("Remove Selected")
        if os.path.exists(ICON_REMOVE):
            self.remove_button.setIcon(QIcon(ICON_REMOVE))
        else: # Fallback
            self.remove_button.setIcon(self.style().standardIcon(QStyle.SP_DialogCancelButton))
            print(f"Warning: Icon not found at {ICON_REMOVE}")

        self.remove_button.clicked.connect(self.remove_url)
        self.layout.addWidget(self.remove_button, 0, Qt.AlignRight) # Align to right

        self.button_box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        # Style standard buttons if needed (QSS above might cover them)
        # self.button_box.button(QDialogButtonBox.Ok).setText("Save")
        # self.button_box.button(QDialogButtonBox.Cancel).setText("Dismiss")
        self.button_box.accepted.connect(self.accept)
        self.button_box.rejected.connect(self.reject)
        self.layout.addWidget(self.button_box)

    def add_url(self):
        url = self.url_input.text().strip().lower()
        if not url:
            QMessageBox.warning(self, "Input Error", "URL cannot be empty.")
            return
        
        items = [self.list_widget.item(i).text() for i in range(self.list_widget.count())]
        if url in items:
            QMessageBox.information(self, "Duplicate", "This URL is already in the list.")
            return
            
        self.list_widget.addItem(url)
        self.url_input.clear()
        self.urls_modified = True

    def remove_url(self):
        selected_items = self.list_widget.selectedItems()
        if not selected_items:
            QMessageBox.warning(self, "Selection Error", "Please select a URL to remove.")
            return
        for item in selected_items:
            self.list_widget.takeItem(self.list_widget.row(item))
        self.urls_modified = True

    def get_urls(self):
        return sorted([self.list_widget.item(i).text() for i in range(self.list_widget.count())])

    def accept(self):
        if self.urls_modified:
            log_event("URL_LIST_DIALOG", f"{self.windowTitle()} modified and OK'd.")
        super().accept()

# --- Main Window ---
class MainWindow(QMainWindow):
    def __init__(self, *args, **kwargs):
        super(MainWindow, self).__init__(*args, **kwargs)
        
        log_event("APP_LIFECYCLE", "Application starting...")

        self.whitelist = self.load_list_from_file(WHITELIST_FILE, "Whitelist")
        self.blacklist = self.load_list_from_file(BLACKLIST_FILE, "Blacklist")

        default_home_url_lower = DEFAULT_HOME_URL.lower()
        is_blacklisted = any(b_url in default_home_url_lower for b_url in self.blacklist)
        is_whitelisted = any(w_url in default_home_url_lower for w_url in self.whitelist)

        if not is_blacklisted and not is_whitelisted:
            self.whitelist.append(default_home_url_lower)
            self.whitelist.sort()
            self.save_list_to_file(WHITELIST_FILE, self.whitelist, "Whitelist")
            log_event("WHITELIST_AUTO_ADD", f"Ensured {DEFAULT_HOME_URL} is in whitelist.")

        self.browser = QWebEngineView()
        self.custom_page = CustomWebEnginePage(self, self.whitelist, self.blacklist)
        self.browser.setPage(self.custom_page)
        
        self.browser.setUrl(QUrl(DEFAULT_HOME_URL))
        self.browser.urlChanged.connect(self.update_urlbar)
        self.browser.loadFinished.connect(self.update_title)
        self.browser.loadStarted.connect(lambda: log_event("BROWSER_EVENT", "Page load started."))
        self.browser.loadFinished.connect(lambda success: log_event("BROWSER_EVENT", f"Page load finished (Success: {success})."))

        self.setCentralWidget(self.browser)
        self.status = QStatusBar()
        self.setStatusBar(self.status)

        self.setup_toolbar()
        self.setup_menus()
        
        self.setWindowTitle(APP_NAME)
        if os.path.exists(APP_ICON_PATH):
            self.setWindowIcon(QIcon(APP_ICON_PATH))
        else:
            print(f"Warning: App icon not found at {APP_ICON_PATH}")


        self.showMaximized()
        log_event("APP_LIFECYCLE", "Main window initialized and shown.")

    def _create_action(self, icon_path, text, tip, callback):
        """Helper to create QAction with icon and fallback."""
        action = QAction(text, self)
        if os.path.exists(icon_path):
            action.setIcon(QIcon(icon_path))
        else:
            print(f"Warning: Icon not found at {icon_path} for action '{text}'")
            # You could add a fallback to QStyle.standardIcon here if desired
            # e.g., action.setIcon(self.style().standardIcon(QStyle.SP_QuestionMark))
        action.setStatusTip(tip)
        action.triggered.connect(lambda: self.log_and_execute(text, callback))
        return action

    def setup_toolbar(self):
        navtb = QToolBar("Navigation")
        navtb.setIconSize(QSize(24, 24)) # Adjust icon size
        navtb.setMovable(False) # Prevent toolbar from being moved
        navtb.setFloatable(False)
        self.addToolBar(navtb)

        back_btn = self._create_action(ICON_BACK, "Back", "Back to previous page", self.browser.back)
        navtb.addAction(back_btn)

        next_btn = self._create_action(ICON_FORWARD, "Forward", "Forward to next page", self.browser.forward)
        navtb.addAction(next_btn)

        reload_btn = self._create_action(ICON_RELOAD, "Reload", "Reload page", self.browser.reload)
        navtb.addAction(reload_btn)

        home_btn = self._create_action(ICON_HOME, "Home", f"Go to Home Page ({DEFAULT_HOME_URL})", self.navigate_home)
        navtb.addAction(home_btn)

        navtb.addSeparator()

        self.urlbar = QLineEdit()
        self.urlbar.returnPressed.connect(self.navigate_to_url)
        navtb.addWidget(self.urlbar)

        stop_btn = self._create_action(ICON_STOP, "Stop", "Stop loading current page", self.browser.stop)
        navtb.addAction(stop_btn)

    def setup_menus(self):
        menubar = self.menuBar()
        
        file_menu = menubar.addMenu("&File")
        exit_action = self._create_action(ICON_EXIT, "E&xit", "Exit application", self.close)
        file_menu.addAction(exit_action)

        settings_menu = menubar.addMenu("&Settings")
        
        manage_whitelist_action = self._create_action(ICON_WHITELIST, "Manage &Whitelist", "Add or remove URLs from the whitelist", self.manage_whitelist)
        settings_menu.addAction(manage_whitelist_action)

        manage_blacklist_action = self._create_action(ICON_BLACKLIST, "Manage &Blacklist", "Add or remove URLs from the blacklist", self.manage_blacklist)
        settings_menu.addAction(manage_blacklist_action)

    def log_and_execute(self, action_name, function_to_call):
        log_event("BUTTON_CLICK", f"{action_name} clicked.")
        function_to_call()

    def update_title(self):
        title = self.browser.page().title()
        self.setWindowTitle(f"{title} - {APP_NAME}")

    def navigate_home(self):
        self.browser.setUrl(QUrl(DEFAULT_HOME_URL))

    def navigate_to_url(self):
        q = QUrl(self.urlbar.text())
        if q.scheme() == "":
            q.setScheme("https")
        log_event("NAVIGATION_INTENT", f"URL bar navigation to: {q.toString()}")
        self.browser.setUrl(q)

    def update_urlbar(self, q):
        self.urlbar.setText(q.toString())
        self.urlbar.setCursorPosition(0)
        log_event("URL_CHANGED", f"Browser URL changed to: {q.toString()}")
        
    def load_list_from_file(self, filename, list_name):
        urls = []
        if os.path.exists(filename):
            try:
                with open(filename, "r", encoding="utf-8") as f:
                    urls = sorted([line.strip().lower() for line in f if line.strip()])
                log_event("FILE_IO", f"Loaded {len(urls)} URLs from {list_name} ({filename}).")
            except IOError as e:
                log_event("FILE_ERROR", f"Error loading {list_name} from {filename}: {e}")
                QMessageBox.warning(self, "File Error", f"Could not load {list_name} from {filename}:\n{e}")
        else:
            log_event("FILE_IO", f"{list_name} file ({filename}) not found. Starting with empty list.")
        return urls

    def save_list_to_file(self, filename, url_list, list_name):
        try:
            with open(filename, "w", encoding="utf-8") as f:
                for url_entry in sorted(url_list):
                    f.write(url_entry + "\n")
            log_event("FILE_IO", f"Saved {len(url_list)} URLs to {list_name} ({filename}).")
        except IOError as e:
            log_event("FILE_ERROR", f"Error saving {list_name} to {filename}: {e}")
            QMessageBox.critical(self, "File Error", f"Could not save {list_name} to {filename}:\n{e}")

    def manage_whitelist(self):
        dialog = UrlListDialog(list(self.whitelist), "Manage Whitelist", self)
        if dialog.exec_() == QDialog.Accepted:
            new_whitelist = dialog.get_urls()
            if new_whitelist != self.whitelist:
                self.whitelist = new_whitelist
                self.save_list_to_file(WHITELIST_FILE, self.whitelist, "Whitelist")
                self.custom_page.whitelist = self.whitelist
                log_event("WHITELIST_MODIFIED", f"Whitelist updated. Count: {len(self.whitelist)}")
                QMessageBox.information(self, "Whitelist Updated", "Whitelist has been updated.")

    def manage_blacklist(self):
        dialog = UrlListDialog(list(self.blacklist), "Manage Blacklist", self)
        if dialog.exec_() == QDialog.Accepted:
            new_blacklist = dialog.get_urls()
            if new_blacklist != self.blacklist:
                self.blacklist = new_blacklist
                self.save_list_to_file(BLACKLIST_FILE, self.blacklist, "Blacklist")
                self.custom_page.blacklist = self.blacklist
                log_event("BLACKLIST_MODIFIED", f"Blacklist updated. Count: {len(self.blacklist)}")
                QMessageBox.information(self, "Blacklist Updated", "Blacklist has been updated.")

    @pyqtSlot(str, str)
    def show_blocked_message_slot(self, url, reason):
        # Make QMessageBox also adhere to the dark theme (partially done by QSS)
        msg_box = QMessageBox(self) # Parent to self
        msg_box.setIcon(QMessageBox.Warning)
        msg_box.setWindowTitle("Navigation Blocked")
        msg_box.setText(f"Access to:\n{url}\n\nwas blocked.")
        msg_box.setInformativeText(f"Reason: {reason}")
        msg_box.setStandardButtons(QMessageBox.Ok)
        msg_box.exec_()


    def closeEvent(self, event):
        log_event("APP_LIFECYCLE", "Application closing...")
        super().closeEvent(event)


if __name__ == '__main__':
    if hasattr(Qt, 'AA_EnableHighDpiScaling'):
        QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    if hasattr(Qt, 'AA_UseHighDpiPixmaps'):
        QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)

    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)

    # Apply the global stylesheet
    app.setStyleSheet(STYLESHEET)
    
    # Set a default font (optional, but good for consistency)
    # default_font = QFont("Segoe UI", 10) # Example for Windows
    # app.setFont(default_font)


    if os.path.exists(APP_ICON_PATH):
        app.setWindowIcon(QIcon(APP_ICON_PATH))
    else:
        print(f"Warning: Main application icon not found at {APP_ICON_PATH}")

    log_event("SESSION_START", f"{APP_NAME} session started.")

    window = MainWindow()
    exit_code = app.exec_()
    
    log_event("SESSION_END", f"{APP_NAME} session ended. Exit code: {exit_code}")
    sys.exit(exit_code)  
