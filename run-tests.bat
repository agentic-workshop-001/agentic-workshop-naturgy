@echo off
REM Test Runner - Backend (Maven/JaCoCo) + Frontend (Vitest)
setlocal enabledelayedexpansion

set REPORTS_DIR=reports
set TIMESTAMP=%date% %time%

echo.
echo ================================================================
echo TEST RUNNER - %TIMESTAMP%
echo ================================================================
echo.

REM Prepare reports directory
echo Preparing reports directory...
if exist %REPORTS_DIR% rmdir /s /q %REPORTS_DIR%
mkdir %REPORTS_DIR%

REM ================================================================
REM BACKEND TESTS
REM ================================================================
echo.
echo ================================================================
echo BACKEND (Spring Boot / JaCoCo)
echo ================================================================
cd backend

echo Running Maven tests...
if exist mvnw.cmd (
    call mvnw.cmd clean test -DskipTests=false
) else (
    mvn clean test -DskipTests=false
)

if %ERRORLEVEL% EQU 0 (
    echo Backend tests PASSED
    
    echo Generating JaCoCo report...
    if exist mvnw.cmd (
        call mvnw.cmd jacoco:report -q
    ) else (
        mvn jacoco:report -q
    )
    
    if exist target\site\jacoco (
        echo Copying JaCoCo report...
        xcopy target\site\jacoco ..\%REPORTS_DIR%\jacoco /E /I /Y > nul
    )
) else (
    echo Backend tests FAILED
)

cd ..

REM ================================================================
REM FRONTEND
REM ================================================================
echo.
echo ================================================================
echo FRONTEND (React / Vite / TypeScript)
echo ================================================================
cd frontend

echo Installing dependencies...
if exist pnpm-lock.yaml (
    pnpm install --frozen-lockfile
) else if exist yarn.lock (
    yarn install --frozen-lockfile
) else (
    npm ci
)

echo Running ESLint...
call npm run lint

echo Building frontend...
call npm run build

echo Running tests...
call npm run test

echo Generating coverage...
call npm run test:coverage

if exist coverage (
    echo Copying coverage report...
    xcopy coverage ..\%REPORTS_DIR%\vitest /E /I /Y > nul
)

cd ..

REM ================================================================
REM GENERATE LANDING HTML
REM ================================================================
echo.
echo ================================================================
echo GENERATING REPORTS DASHBOARD
echo ================================================================

setlocal enabledelayedexpansion
(
echo ^<!DOCTYPE html^>
echo ^<html lang="en"^>
echo ^<head^>
echo     ^<meta charset="UTF-8"^>
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^>
echo     ^<title^>Test Reports - Naturgy Gas Workshop^</title^>
echo     ^<style^>
echo         * { margin: 0; padding: 0; box-sizing: border-box; }
echo         body { font-family: Arial, sans-serif; background: #f5f5f5; }
echo         header { background: #667eea; color: white; padding: 30px; text-align: center; }
echo         h1 { font-size: 2em; margin-bottom: 10px; }
echo         .container { max-width: 1000px; margin: 20px auto; }
echo         .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
echo         .card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
echo         .card h2 { color: #333; margin-bottom: 15px; }
echo         .status { padding: 10px; border-radius: 3px; margin: 10px 0; }
echo         .pass { background: #d4edda; color: #155724; }
echo         .fail { background: #f8d7da; color: #721c24; }
echo         .link { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 3px; text-decoration: none; margin-top: 10px; }
echo         .link:hover { background: #5568d3; }
echo         .link.disabled { background: #ccc; cursor: not-allowed; }
echo         .summary { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px; }
echo         .summary ul { list-style: none; }
echo         .summary li { padding: 8px 0; border-bottom: 1px solid #eee; }
echo         footer { text-align: center; color: #666; padding: 20px; }
echo     ^</style^>
echo ^</head^>
echo ^<body^>
echo     ^<header^>
echo         ^<h1^>Test Reports Dashboard^</h1^>
echo         ^<p^>Naturgy Gas Workshop^</p^>
echo     ^</header^>
echo     
echo     ^<div class="container"^>
echo         ^<div class="card"^>
echo             ^<h2^>Backend Coverage (JaCoCo)^</h2^>
echo             ^<p^>Spring Boot code coverage report^</p^>
) > %REPORTS_DIR%\index.html

if exist %REPORTS_DIR%\jacoco\index.html (
    echo             ^<div class="status pass"^>Available^</div^> >> %REPORTS_DIR%\index.html
    echo             ^<a href="jacoco/index.html" class="link"^>View JaCoCo Report^</a^> >> %REPORTS_DIR%\index.html
) else (
    echo             ^<div class="status fail"^>Not Generated^</div^> >> %REPORTS_DIR%\index.html
)

(
echo         ^</div^>
echo         
echo         ^<div class="card"^>
echo             ^<h2^>Frontend Tests (Vitest)^</h2^>
echo             ^<p^>React component test coverage^</p^>
) >> %REPORTS_DIR%\index.html

if exist %REPORTS_DIR%\vitest\index.html (
    echo             ^<div class="status pass"^>Available^</div^> >> %REPORTS_DIR%\index.html
    echo             ^<a href="vitest/index.html" class="link"^>View Coverage Report^</a^> >> %REPORTS_DIR%\index.html
) else (
    echo             ^<div class="status fail"^>Not Generated^</div^> >> %REPORTS_DIR%\index.html
)

(
echo         ^</div^>
echo     ^</div^>
echo     
echo     ^<footer^>
echo         ^<p^>Naturgy Gas Workshop - QA Dashboard^</p^>
echo     ^</footer^>
echo ^</body^>
echo ^</html^>
) >> %REPORTS_DIR%\index.html

echo.
echo ================================================================
echo SUMMARY
echo ================================================================
echo Reports generated in: %cd%\%REPORTS_DIR%
echo Dashboard: %cd%\%REPORTS_DIR%\index.html
echo.
dir /s %REPORTS_DIR%
echo.
echo ================================================================
