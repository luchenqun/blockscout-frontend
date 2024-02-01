#!/bin/bash

config_file="./configs/envs/.env.pw"

rm -rf ./playwright/.cache

dotenv \
  -e $config_file \
  -- bash -c './deploy/scripts/make_envs_script.sh ./playwright/envs.js'

yarn svg:build-sprite

# Check if the "--affected" argument is present in the script args
check_affected_flag() {
    local affected_flag=false

    for arg in "$@"; do
        if [ "$arg" = "--affected" ]; then
            # Extract the value after the equals sign
            is_affected_value=${is_affected_arg#*=}

            if [ "$is_affected_value" != "false" ]; then
                affected_flag=true
            fi
            
            break
        fi
    done

    echo "$affected_flag"
}

# Remove the "--affected" argument from the script args
filter_arguments() {
    local args=()

    for arg in "$@"; do
        if [[ "$arg" != "--affected"* ]]; then
            args+=("$arg")
        fi
    done

    echo "${args[@]}"
}

get_files_to_run() {
  local is_affected=$1
  local files_to_run=""

  if [ "$is_affected" = true ]; then
      affected_tests_file="./playwright/affected-tests.txt"

      if [ -f "$affected_tests_file" ]; then
          file_content=$(<"$affected_tests_file")
          files_to_run="${file_content//$'\n'/$' '}"
      else 
          echo "No affected tests found. Running all tests."
      fi
  fi

  echo "$files_to_run"
}

args=$(filter_arguments "$@")
affected_flag=$(check_affected_flag "$@")
files_to_run=$(get_files_to_run "$affected_flag")

echo "Running Playwright tests with the following arguments: $args"
echo "Affected flag: $affected_flag"
echo "Files to run: $files_to_run"

dotenv \
  -v NODE_OPTIONS=\"--max-old-space-size=4096\" \
  -e $config_file \
  -- playwright test -c playwright-ct.config.ts $files_to_run "${args[@]}"

