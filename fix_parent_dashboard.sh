#!/bin/bash
sed -i 's/bg-linear-to-r from-pink-50 via-rose-50 to-indigo-50 border border-pink-200/bg-[#FDF6E3] border border-[#E5DACD]/g' src/components/parent/ParentDashboard.tsx
sed -i 's/border-indigo-600 bg-indigo-50\/80 shadow-xs ring-2 ring-indigo-200/border-[#D97757] bg-[#FDF6E3] shadow-sm ring-2 ring-[#E5DACD]/g' src/components/parent/ParentDashboard.tsx
sed -i 's/bg-indigo-600 hover:bg-indigo-700/bg-[#D97757] hover:bg-[#C26243]/g' src/components/parent/ParentDashboard.tsx
sed -i 's/text-indigo-600/text-[#D97757]/g' src/components/parent/ParentDashboard.tsx
sed -i 's/bg-indigo-50/bg-[#FDF6E3]/g' src/components/parent/ParentDashboard.tsx
