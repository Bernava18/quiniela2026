bash

cat /home/claude/quiniela2026/src/pages/QuinielaPage.jsx | head -5 && echo "..." && wc -l /home/claude/quiniela2026/src/pages/QuinielaPage.jsx
Output

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, savePick, getQuinielaPicks, getAllResults, downloadQuinielaBackup } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

...
162 /home/claude/quiniela2026/src/pages/QuinielaPage.jsx
