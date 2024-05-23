#!/bin/bash

(set -x;codesign --sign - p2-pnut-ts-macos-arm64)
(set -x;codesign --sign - p2-pnut-ts-macos-x64)
(set -x;cp -p p2-pnut-ts-macos-arm64 pnut_ts)
