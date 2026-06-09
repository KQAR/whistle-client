#!/bin/bash
# 构建本机可安装的 macOS dmg（默认 arm64）。
#
# 背景：本项目 `asar: false`（运行时需向 Resources/app 写入插件，不能打包成 asar）。
# 在这种布局下，用 ad-hoc 签名（identity=null）时 electron-builder 24.x 只签了主可执行文件，
# 散落在 Resources/app 下的资源文件未被纳入签名 → 签名结构损坏 → macOS 报“已损坏”且无法绕过。
#
# 解决：electron-builder 出 app 后，对整个 bundle 做一次深度 ad-hoc 重签，再用 ditto（保留签名
# 元数据，cp -R 会丢失）打成 dmg。产物为未公证的 ad-hoc 签名 app：本机/自分发可用，
# 首次打开需右键→打开绕过 Gatekeeper。
#
# 用法：
#   bash scripts/build-mac-dmg.sh [arm64|x64]
set -euo pipefail

ARCH="${1:-arm64}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -e 'console.log(require("./package.json").version)')"
APP_OUT="dist/mac-${ARCH}/Whistle.app"
DMG_OUT="dist/Whistle-v${VERSION}-mac-${ARCH}.dmg"
VOL_NAME="Whistle ${VERSION}-${ARCH}"

echo "==> [1/5] 构建 MCP server"
npm run --silent build:mcp

echo "==> [2/5] electron-builder 打包 mac ${ARCH} app（跳过签名，稍后深度重签）"
CSC_IDENTITY_AUTO_DISCOVERY=false \
  ./node_modules/.bin/electron-builder --mac dir --"${ARCH}" -c.mac.identity=null -p never

if [ ! -d "$APP_OUT" ]; then
  echo "ERROR: 未找到构建产物 $APP_OUT" >&2
  exit 1
fi

echo "==> [3/5] 深度 ad-hoc 重签整个 bundle"
codesign --force --deep --sign - "$APP_OUT"
codesign --verify --deep --strict --verbose=2 "$APP_OUT" 2>&1 | tail -2

echo "==> [4/5] 用 ditto 暂存并封装 dmg（保留签名元数据）"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/whistle-dmg.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
ditto "$APP_OUT" "$STAGE/Whistle.app"
ln -s /Applications "$STAGE/Applications"
# 暂存后再签一次，确保万无一失
codesign --force --deep --sign - "$STAGE/Whistle.app"
rm -f "$DMG_OUT"
hdiutil create -volname "$VOL_NAME" -srcfolder "$STAGE" -ov -format UDZO "$DMG_OUT" >/dev/null

echo "==> [5/5] 校验最终 dmg 内的签名"
MNT="$(hdiutil attach "$DMG_OUT" -nobrowse -noautoopen | tail -1 | awk -F'\t' '{print $NF}')"
if codesign --verify --deep --strict "$MNT/Whistle.app" 2>/dev/null; then
  echo "    签名校验通过：valid on disk"
else
  echo "    ERROR: dmg 内 app 签名校验失败" >&2
  hdiutil detach "$MNT" >/dev/null 2>&1 || true
  exit 1
fi
hdiutil detach "$MNT" >/dev/null

echo ""
echo "✅ 完成：$DMG_OUT"
ls -lh "$DMG_OUT" | awk '{print "   大小:", $5}'
echo "   提示：未公证，首次打开需右键 → 打开。"
