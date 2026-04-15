#!/bin/bash

# CaseDive Sync Script
# Syncs all files from this conversation to your local project
# Usage: bash sync-casefinder.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== CaseDive File Sync ===${NC}\n"

# Check if project directory exists
PROJECT_DIR="$HOME/Desktop/casedive"

if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}Error: Project directory not found at $PROJECT_DIR${NC}"
    echo "Please update PROJECT_DIR in this script to match your actual project location"
    exit 1
fi

echo -e "${BLUE}Project directory: $PROJECT_DIR${NC}\n"

# 1. Copy plan files from /mnt/project/
echo -e "${BLUE}Step 1: Copying plan files...${NC}"
if [ -f "/mnt/project/CASEFINDER_2_0_PLAN.md" ]; then
    cp /mnt/project/CASEFINDER_2_0_PLAN.md "$PROJECT_DIR/"
    echo -e "${GREEN}✓ CASEFINDER_2_0_PLAN.md${NC}"
else
    echo -e "${YELLOW}⚠ CASEFINDER_2_0_PLAN.md not found${NC}"
fi

if [ -f "/mnt/project/CASEFINDER_SKILLS_PLAN.md" ]; then
    cp /mnt/project/CASEFINDER_SKILLS_PLAN.md "$PROJECT_DIR/"
    echo -e "${GREEN}✓ CASEFINDER_SKILLS_PLAN.md${NC}"
else
    echo -e "${YELLOW}⚠ CASEFINDER_SKILLS_PLAN.md not found${NC}"
fi

echo ""

# 2. Create SKILLS folder and copy skill files
echo -e "${BLUE}Step 2: Creating SKILLS folder and copying skill files...${NC}"
SKILLS_DIR="$PROJECT_DIR/SKILLS"
mkdir -p "$SKILLS_DIR"

# Copy all skill files from /tmp/casefinder-skills/
if [ -d "/tmp/casefinder-skills" ]; then
    # Create subfolders for each skill
    mkdir -p "$SKILLS_DIR/criminal-code-builder"
    mkdir -p "$SKILLS_DIR/canlii-case-verification"
    mkdir -p "$SKILLS_DIR/canlii-prompt-engineering"
    mkdir -p "$SKILLS_DIR/civil-law-database-builder"
    
    # Copy SKILL.md files (renamed from *-SKILL.md)
    if [ -f "/tmp/casefinder-skills/criminal-code-builder-SKILL.md" ]; then
        cp /tmp/casefinder-skills/criminal-code-builder-SKILL.md "$SKILLS_DIR/criminal-code-builder/SKILL.md"
        echo -e "${GREEN}✓ criminal-code-builder/SKILL.md${NC}"
    fi
    
    if [ -f "/tmp/casefinder-skills/canlii-case-verification-SKILL.md" ]; then
        cp /tmp/casefinder-skills/canlii-case-verification-SKILL.md "$SKILLS_DIR/canlii-case-verification/SKILL.md"
        echo -e "${GREEN}✓ canlii-case-verification/SKILL.md${NC}"
    fi
    
    if [ -f "/tmp/casefinder-skills/canlii-prompt-engineering-SKILL.md" ]; then
        cp /tmp/casefinder-skills/canlii-prompt-engineering-SKILL.md "$SKILLS_DIR/canlii-prompt-engineering/SKILL.md"
        echo -e "${GREEN}✓ canlii-prompt-engineering/SKILL.md${NC}"
    fi
    
    if [ -f "/tmp/casefinder-skills/civil-law-database-builder-SKILL.md" ]; then
        cp /tmp/casefinder-skills/civil-law-database-builder-SKILL.md "$SKILLS_DIR/civil-law-database-builder/SKILL.md"
        echo -e "${GREEN}✓ civil-law-database-builder/SKILL.md${NC}"
    fi
    
    # Copy README
    if [ -f "/tmp/casefinder-skills/README.md" ]; then
        cp /tmp/casefinder-skills/README.md "$SKILLS_DIR/README.md"
        echo -e "${GREEN}✓ README.md${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skills directory not found${NC}"
fi

echo ""

# 3. Summary
echo -e "${BLUE}Step 3: Verification...${NC}"
echo -e "${GREEN}Files synced to: $PROJECT_DIR${NC}"
echo ""

# Show what was created
echo -e "${BLUE}Folder structure:${NC}"
echo "$PROJECT_DIR/"
echo "├── CASEFINDER_2_0_PLAN.md"
echo "├── CASEFINDER_SKILLS_PLAN.md"
echo "└── SKILLS/"
echo "    ├── README.md"
echo "    ├── criminal-code-builder/"
echo "    │   └── SKILL.md"
echo "    ├── canlii-case-verification/"
echo "    │   └── SKILL.md"
echo "    ├── canlii-prompt-engineering/"
echo "    │   └── SKILL.md"
echo "    └── civil-law-database-builder/"
echo "        └── SKILL.md"

echo ""
echo -e "${GREEN}✓ Sync complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Open VS Code: cd $PROJECT_DIR && code ."
echo "2. View plans: Open CASEFINDER_2_0_PLAN.md and CASEFINDER_SKILLS_PLAN.md"
echo "3. Sunday: Install skills by copying SKILLS folder to /mnt/skills/user/"

