#!/bin/bash

# Tax Deed Flow - Development Environment Setup Script
# This script sets up and runs the development environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Tax Deed Flow - Development Environment Setup        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed.${NC}"
        echo "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}Error: Node.js 18+ is required. Found: $(node -v)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

    # Check pnpm (preferred) or npm
    if command -v pnpm &> /dev/null; then
        PKG_MANAGER="pnpm"
        echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"
    elif command -v npm &> /dev/null; then
        PKG_MANAGER="npm"
        echo -e "${YELLOW}! pnpm not found, using npm instead${NC}"
        echo -e "${GREEN}✓ npm $(npm -v)${NC}"
    else
        echo -e "${RED}Error: No package manager found. Please install pnpm or npm.${NC}"
        exit 1
    fi

    # Check Git
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}! Git is not installed. Version control will not be available.${NC}"
    else
        echo -e "${GREEN}✓ Git $(git --version | cut -d ' ' -f 3)${NC}"
    fi

    echo ""
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"

    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: package.json not found. Run this script from the project root.${NC}"
        exit 1
    fi

    if [ "$PKG_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi

    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

# Setup environment file
setup_env() {
    echo -e "${YELLOW}Setting up environment...${NC}"

    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            echo -e "${YELLOW}! Created .env.local from .env.example${NC}"
            echo -e "${YELLOW}! Please update .env.local with your actual credentials${NC}"
        else
            echo -e "${YELLOW}! No .env.example found. Creating minimal .env.local...${NC}"
            cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# n8n Configuration
N8N_URL=https://n8n.lfb-investments.com
N8N_API_KEY=your-n8n-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
            echo -e "${RED}! Please update .env.local with your actual credentials${NC}"
        fi
    else
        echo -e "${GREEN}✓ .env.local already exists${NC}"
    fi

    echo ""
}

# Initialize shadcn/ui components
setup_shadcn() {
    echo -e "${YELLOW}Setting up shadcn/ui components...${NC}"

    if [ ! -d "src/components/ui" ]; then
        echo "Installing shadcn/ui base components..."

        if [ "$PKG_MANAGER" = "pnpm" ]; then
            # Install essential components
            pnpm dlx shadcn@latest add button card dialog dropdown-menu input label select table tabs badge progress skeleton toast tooltip calendar checkbox switch sheet command popover avatar separator scroll-area -y 2>/dev/null || true
        else
            npx shadcn@latest add button card dialog dropdown-menu input label select table tabs badge progress skeleton toast tooltip calendar checkbox switch sheet command popover avatar separator scroll-area -y 2>/dev/null || true
        fi

        echo -e "${GREEN}✓ shadcn/ui components installed${NC}"
    else
        echo -e "${GREEN}✓ shadcn/ui components already set up${NC}"
    fi

    echo ""
}

# Generate Supabase types
generate_types() {
    echo -e "${YELLOW}Generating Supabase types...${NC}"

    if command -v supabase &> /dev/null; then
        if [ -f "src/types/supabase.ts" ]; then
            echo -e "${GREEN}✓ Supabase types already exist${NC}"
        else
            echo "Run 'supabase gen types typescript --local > src/types/supabase.ts' to generate types"
        fi
    else
        echo -e "${YELLOW}! Supabase CLI not installed. Types generation skipped.${NC}"
        echo "Install with: npm install -g supabase"
    fi

    echo ""
}

# Start development server
start_dev() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║               Starting Development Server                   ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Application will be available at: http://localhost:3000${NC}"
    echo ""
    echo -e "${YELLOW}Available pages:${NC}"
    echo "  - Dashboard:      http://localhost:3000/"
    echo "  - Properties:     http://localhost:3000/properties"
    echo "  - Counties:       http://localhost:3000/counties"
    echo "  - Auctions:       http://localhost:3000/auctions"
    echo "  - Orchestration:  http://localhost:3000/orchestration"
    echo "  - Batch Jobs:     http://localhost:3000/batch-jobs"
    echo "  - Data Integrity: http://localhost:3000/data-integrity"
    echo "  - Settings:       http://localhost:3000/settings"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
    echo ""

    if [ "$PKG_MANAGER" = "pnpm" ]; then
        pnpm dev
    else
        npm run dev
    fi
}

# Main execution
main() {
    check_requirements
    install_dependencies
    setup_env
    # setup_shadcn  # Uncomment when project is scaffolded
    generate_types
    start_dev
}

# Handle script arguments
case "${1:-}" in
    "install")
        check_requirements
        install_dependencies
        setup_env
        echo -e "${GREEN}✓ Installation complete!${NC}"
        ;;
    "dev")
        start_dev
        ;;
    "setup")
        check_requirements
        install_dependencies
        setup_env
        setup_shadcn
        generate_types
        echo -e "${GREEN}✓ Setup complete!${NC}"
        ;;
    *)
        main
        ;;
esac
