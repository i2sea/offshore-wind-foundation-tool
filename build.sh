#!/bin/sh
# src/ 파일을 합쳐 게시용 한 파일(dist/foundation-tool.html)을 만든다.
set -e
cd "$(dirname "$0")"
{ cat src/head.html; printf '<script>\n"use strict";\n'; cat src/engine.js; printf '\n'; cat src/member.js; printf '\n'; cat src/mono.js; printf '\n'; cat src/pile.js; printf '\n'; cat src/jacket.js; printf '\n'; cat src/ui.js; printf '\n'; cat src/ui-mono.js; printf '\n'; cat src/ui-jacket.js; printf '\n'; cat src/start.js; printf '</script>\n'; } > dist/foundation-tool.html
node -e "new Function(require('fs').readFileSync('dist/foundation-tool.html','utf8').split('<script>\n')[1].split('</script>')[0])"
echo "dist/foundation-tool.html $(wc -c < dist/foundation-tool.html) bytes, 문법 확인 통과"
