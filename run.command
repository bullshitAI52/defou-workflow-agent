#!/bin/bash

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin
cd "$PROJECT_DIR" || exit

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}       Defou Workflow Agent Launcher          ${NC}"
echo -e "${BLUE}==============================================${NC}"
echo -e "Project Directory: $PROJECT_DIR"
echo ""

# Check Dependencies
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed or not in PATH.${NC}"
    echo "Please install Node.js to continue."
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in PATH.${NC}"
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
fi

# Menu
echo -e "${YELLOW}Select an operation to run:${NC}"
echo -e "1) ${GREEN}Start Main Workflow${NC} (Watches for files in inputs/)"
echo -e "2) ${GREEN}Run TopHub Skill${NC} (Fetch trends & process)"
echo -e "3) ${GREEN}Run Combo Skill${NC} (TopHub + Defou + Stanley)"
echo -e "4) ${GREEN}Run Viral Verification${NC} (Check viral potential)"
echo -e "5) ${GREEN}Run Master Orchestrator${NC}"
echo -e "6) ${GREEN}List Articles${NC}"
echo -e "0) ${RED}Exit${NC}"
echo ""
read -p "Enter choice [1-6]: " choice

echo ""
echo -e "${BLUE}----------------------------------------------${NC}"

case $choice in
    1)
        echo -e "${CYAN}Starting Main Workflow (npm start)...${NC}"
        npm start
        ;;
    2)
        echo -e "${CYAN}Running TopHub Skill (npm run skill:tophub)...${NC}"
        npm run skill:tophub
        ;;
    3)
        echo -e "${CYAN}Running Combo Skill (npm run skill:combo)...${NC}"
        npm run skill:combo
        ;;
    4)
        echo -e "${CYAN}Running Viral Verification (npm run skill:verify)...${NC}"
        npm run skill:verify
        ;;
    5)
        echo -e "${CYAN}Running Master Orchestrator (npm run skill:master)...${NC}"
        npm run skill:master
        ;;
    6)
        echo -e "${CYAN}Running Article List (npm run skill:list)...${NC}"
        npm run skill:list
        ;;
    0)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice.${NC}"
        ;;
esac

echo ""
echo -e "${BLUE}----------------------------------------------${NC}"
echo -e "${GREEN}Task Completed.${NC}"
read -n 1 -s -r -p "Press any key to close this window..."
