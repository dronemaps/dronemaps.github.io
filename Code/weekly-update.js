#!/usr/bin/env node

/**
 * Weekly Data Retrieval and GitHub Upload Script
 *
 * This script:
 * 1. Runs both BAZL and DJI data retrievers
 * 2. Asks user for confirmation to upload new data to GitHub
 * 3. Copies new data files to FlightObstacleData/ with correct names
 * 4. Commits and pushes to GitHub if user confirms
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Paths
const ROOT_DIR = path.join(__dirname, '..');
const BAZL_DIR = path.join(__dirname, 'BAZL Data retriever');
const DJI_DIR = path.join(__dirname, 'DJI NoFlyZones', 'dji_data_retriever');
const FLIGHT_OBSTACLE_DIR = path.join(ROOT_DIR, 'FlightObstacleData');

// Target file names
const BAZL_TARGET_NAME = 'unifiedFlightObstacles.json';
const DJI_TARGET_NAME = 'manufacturerFlightObstacles.json';

console.log('='.repeat(70));
console.log('Weekly Data Retrieval Script - DroneMaps');
console.log('='.repeat(70));
console.log();

/**
 * Execute shell command and return output
 */
function runCommand(command, cwd = ROOT_DIR, options = {}) {
    try {
        const output = execSync(command, {
            cwd,
            encoding: 'utf-8',
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options
        });
        return output;
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        console.error(error.message);
        throw error;
    }
}

/**
 * Get today's date in DD-MM-YYYY format
 */
function getTodayDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

/**
 * Find the most recent data file in a directory
 */
function findLatestDataFile(directory, pattern) {
    const files = fs.readdirSync(directory);
    const matchingFiles = files.filter(f => f.match(pattern));

    if (matchingFiles.length === 0) {
        throw new Error(`No files matching pattern ${pattern} found in ${directory}`);
    }

    // Sort by modification time, most recent first
    matchingFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(directory, a));
        const statB = fs.statSync(path.join(directory, b));
        return statB.mtime - statA.mtime;
    });

    return path.join(directory, matchingFiles[0]);
}

/**
 * Ask user for yes/no confirmation
 */
function askConfirmation(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(`${question} (y/n): `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

/**
 * Main execution
 */
async function main() {
    try {
        // Step 1: Run BAZL Data Retriever
        console.log('\n' + '-'.repeat(70));
        console.log('Step 1/4: Running BAZL Data Retriever...');
        console.log('-'.repeat(70));
        console.log();

        runCommand('npm start', BAZL_DIR);

        console.log('\n✓ BAZL Data Retriever completed successfully');

        // Step 2: Run DJI Data Retriever
        console.log('\n' + '-'.repeat(70));
        console.log('Step 2/4: Running DJI NoFlyZones Retriever...');
        console.log('-'.repeat(70));
        console.log();

        runCommand('npm start', DJI_DIR);

        console.log('\n✓ DJI Data Retriever completed successfully');

        // Step 3: Find the latest data files
        console.log('\n' + '-'.repeat(70));
        console.log('Step 3/4: Locating new data files...');
        console.log('-'.repeat(70));
        console.log();

        const todayDate = getTodayDate();
        const bazlDataDir = path.join(BAZL_DIR, 'data');
        const djiDataDir = path.join(DJI_DIR, 'data');

        const bazlLatestFile = findLatestDataFile(bazlDataDir, /BAZLdata_.*\.json/);
        const djiLatestFile = findLatestDataFile(djiDataDir, /DJI-NoFlyZones_.*\.json/);

        console.log(`✓ Latest BAZL file: ${path.basename(bazlLatestFile)}`);
        console.log(`✓ Latest DJI file: ${path.basename(djiLatestFile)}`);

        // Show file sizes
        const bazlSize = (fs.statSync(bazlLatestFile).size / 1024 / 1024).toFixed(2);
        const djiSize = (fs.statSync(djiLatestFile).size / 1024 / 1024).toFixed(2);
        console.log(`  BAZL file size: ${bazlSize} MB`);
        console.log(`  DJI file size: ${djiSize} MB`);

        // Step 4: Ask for user confirmation
        console.log('\n' + '-'.repeat(70));
        console.log('Step 4/4: User Confirmation');
        console.log('-'.repeat(70));
        console.log();
        console.log('New data files are ready to be uploaded to GitHub.');
        console.log();
        console.log('This will:');
        console.log(`  1. Copy ${path.basename(bazlLatestFile)} → ${BAZL_TARGET_NAME}`);
        console.log(`  2. Copy ${path.basename(djiLatestFile)} → ${DJI_TARGET_NAME}`);
        console.log('  3. Commit changes to git');
        console.log('  4. Push to GitHub');
        console.log();

        const confirmed = await askConfirmation('Do you want to proceed with uploading BOTH files to GitHub?');

        let uploadBazl = confirmed;
        let uploadDji = confirmed;

        if (!confirmed) {
            console.log('\n❓ Upload of both files declined.');
            console.log();

            // Ask for individual file uploads
            uploadBazl = await askConfirmation('Do you want to upload BAZL data only?');
            uploadDji = await askConfirmation('Do you want to upload DJI data only?');

            if (!uploadBazl && !uploadDji) {
                console.log('\n❌ Upload cancelled by user.');
                console.log('Data files have been generated but not uploaded to GitHub.');
                process.exit(0);
            }
        }

        // Step 5: Copy files to FlightObstacleData
        console.log('\n' + '-'.repeat(70));
        console.log('Copying files to FlightObstacleData/...');
        console.log('-'.repeat(70));
        console.log();

        // Ensure FlightObstacleData directory exists
        if (!fs.existsSync(FLIGHT_OBSTACLE_DIR)) {
            fs.mkdirSync(FLIGHT_OBSTACLE_DIR, { recursive: true });
            console.log(`✓ Created directory: ${FLIGHT_OBSTACLE_DIR}`);
        }

        const bazlTarget = path.join(FLIGHT_OBSTACLE_DIR, BAZL_TARGET_NAME);
        const djiTarget = path.join(FLIGHT_OBSTACLE_DIR, DJI_TARGET_NAME);

        const filesToUpload = [];

        if (uploadBazl) {
            fs.copyFileSync(bazlLatestFile, bazlTarget);
            console.log(`✓ Copied: ${BAZL_TARGET_NAME}`);
            filesToUpload.push({ name: BAZL_TARGET_NAME, size: bazlSize, type: 'BAZL Swiss restrictions' });
        } else {
            console.log(`○ Skipped: ${BAZL_TARGET_NAME}`);
        }

        if (uploadDji) {
            fs.copyFileSync(djiLatestFile, djiTarget);
            console.log(`✓ Copied: ${DJI_TARGET_NAME}`);
            filesToUpload.push({ name: DJI_TARGET_NAME, size: djiSize, type: 'DJI manufacturer zones' });
        } else {
            console.log(`○ Skipped: ${DJI_TARGET_NAME}`);
        }

        // Step 6: Git operations
        console.log('\n' + '-'.repeat(70));
        console.log('Committing and pushing to GitHub...');
        console.log('-'.repeat(70));
        console.log();

        // Add selected files to git
        if (uploadBazl) {
            runCommand(`git add "${path.join('FlightObstacleData', BAZL_TARGET_NAME)}"`, ROOT_DIR);
        }
        if (uploadDji) {
            runCommand(`git add "${path.join('FlightObstacleData', DJI_TARGET_NAME)}"`, ROOT_DIR);
        }
        console.log('✓ Files added to git staging');

        // Check if there are actually changes to commit
        const gitStatusStaged = runCommand('git diff --cached --name-only', ROOT_DIR, { silent: true });

        if (!gitStatusStaged.trim()) {
            console.log('\n⚠ No changes detected in staged files.');
            console.log('The copied files are identical to the versions already in FlightObstacleData/.');
            const proceedAnyway = await askConfirmation('Do you want to commit anyway (empty commit)?');

            if (!proceedAnyway) {
                console.log('\n✓ Process completed. No changes committed.');
                console.log('Data files have been copied but not committed to git.');
                process.exit(0);
            }
        }

        // Create commit message based on selected files
        let commitMessageLines = [`Update flight obstacle data - ${todayDate}`, '', 'Updated files:'];

        filesToUpload.forEach(file => {
            commitMessageLines.push(`- ${file.name} (${file.type}, ${file.size} MB)`);
        });

        commitMessageLines.push('', '🤖 Generated with [Claude Code](https://claude.com/claude-code)', '', 'Co-Authored-By: Claude <noreply@anthropic.com>');

        const commitMessage = commitMessageLines.join('\n');

        // Commit (only if there are changes, or allow empty commit if user confirmed)
        try {
            if (gitStatusStaged.trim()) {
                // Normal commit with changes
                runCommand(`git commit -m "${commitMessage.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, ROOT_DIR);
                console.log('✓ Changes committed');
            } else {
                // Empty commit (user confirmed)
                runCommand(`git commit --allow-empty -m "${commitMessage.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, ROOT_DIR);
                console.log('✓ Empty commit created');
            }
        } catch (error) {
            console.error('❌ Commit failed:', error.message);
            console.log('\nℹ You may need to commit manually:');
            console.log(`  git commit -m "Update flight obstacle data - ${todayDate}"`);
            process.exit(1);
        }

        // Push to GitHub
        console.log('\nPushing to GitHub...');
        runCommand('git push', ROOT_DIR);
        console.log('✓ Pushed to GitHub');

        // Success summary
        console.log('\n' + '='.repeat(70));
        console.log('✅ SUCCESS! Weekly update completed');
        console.log('='.repeat(70));
        console.log();
        console.log('Summary:');

        filesToUpload.forEach(file => {
            console.log(`  - ${file.type} updated (${file.size} MB)`);
        });

        console.log('  - Changes committed and pushed to GitHub');
        console.log();

    } catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('❌ ERROR: Weekly update failed');
        console.error('='.repeat(70));
        console.error();
        console.error(error.message);
        console.error();
        process.exit(1);
    }
}

// Run main function
main();
