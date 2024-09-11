#!/bin/bash
SCRIPT=${0##*/}
SCRIPT_VERSION="1.0"

# Store the original directory
original_dir=$(pwd)
changed_dir=false

# Check if the current directory is scripts-pkg
if [ "${PWD##*/}" != "scripts-pkg" ]; then
  cd scripts-pkg || { echo "${SCRIPT}: ERROR: Failed to change directory to scripts-pkg"; exit 1; }
  changed_dir=true
fi

upload_dir="_UPLOAD"
unzipped_dir="_unzipped"

(set -x; rm -f ${upload_dir}/*)
(set -x; rm -rf ${unzipped_dir}/*/*)

# Change back to the original directory if we changed to scripts-pkg
if [ "$changed_dir" = true ]; then
  cd "$original_dir" || { echo "${SCRIPT}: ERROR: Failed to change back to the original directory"; exit 1; }
fi
