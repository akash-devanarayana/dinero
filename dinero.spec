# PyInstaller spec for the Dinero desktop app.
# Build:  npm run app   (esbuild bundle, then PyInstaller)
# Output: dist-app/Dinero.exe (one file; DB lives in %APPDATA%\Dinero)
block_cipher = None

a = Analysis(
    ["backend/desktop.py"],
    pathex=["backend"],
    # Static frontend files, bundled at the same relative paths app.py serves
    # them from (ROOT = sys._MEIPASS when frozen).
    datas=[
        ("Dinero.html", "."),
        ("dist/dinero.js", "dist"),
        ("dist/dinero.css", "dist"),
    ],
    hiddenimports=[],
    hookspath=[],
    runtime_hooks=[],
    excludes=["tkinter"],
    cipher=block_cipher,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name="Dinero",
    console=False,           # no terminal window
    upx=False,
)
