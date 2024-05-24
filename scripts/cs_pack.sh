#!/bin/bash

(set -x;codesign --sign - p2-pnut-ts-macos-arm64)
(set -x;codesign --sign - p2-pnut-ts-macos-x64)
# prepare macos x64
mkdir -p macos/macos-x64
(set -x;cp -p p2-pnut-ts-macos-x64 macos/macos-x64/pnut_ts)
(set -x;cp -p _dist/* macos/macos-x64/)
# prepare macos arm64
mkdir -p macos/macos-arm64
(set -x;cp -p p2-pnut-ts-macos-arm64 macos/macos-arm64/pnut_ts)
(set -x;cp -p _dist/* macos/macos-arm64)
# prepare Windows x64
mkdir -p win/win-x64
(set -x;cp -p p2-pnut-ts-win-x64.exe win/win-x64/pnut_ts.exe)
(set -x;cp -p _dist/* win/win-x64)
# prepare Windows arm64
mkdir -p win/win-arm64
(set -x;cp -p p2-pnut-ts-win-arm64.exe win/win-arm64/pnut_ts.exe)
(set -x;cp -p _dist/* win/win-arm64)
# prepare Linux x64
mkdir -p linux/linux-x64
(set -x;cp -p p2-pnut-ts-linux-arm64 linux/linux-x64/pnut_ts)
(set -x;cp -p _dist/* linux/linux-x64)
# prepare Linux arm64
mkdir -p linux/linux-arm64
(set -x;cp -p p2-pnut-ts-linux-arm64 linux/linux-arm64/pnut_ts)
(set -x;cp -p _dist/* linux/linux-arm64)
