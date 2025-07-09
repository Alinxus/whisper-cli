#!/usr/bin/env node
import chalk from 'chalk';
import inquirer from 'inquirer';
import figlet from 'figlet';
import { createSpinner } from 'nanospinner';

console.log(chalk.bgGreen('hi mom'))


let playerName;
const sleep = (ms=2000) => new Promise((r) => setTimeout(r, ms));
async function welcome() {
    const rainbowTitle = 'whisper'
    await sleep()

    console.log(`${chalk.bgBlue('How to play')}`)
}
await welcome();


async function askName(){
    const answers = await inquirer.prompt({
        name: 'player_name',
        type: 'input',
        message: 'What is your name?',
        default() {
            return 'Player';
        }
    });
    playerName = answers.player_name;
    console.log(`Welcome ${chalk.green(playerName)}!`);
}
await askName();

async function askQuestion() {
    const answers = await inquirer.prompt({
        name: 'question_1',
        type: 'list',
        message: 'What is your favorite color?',
        choices: [
            'Red',
            'Blue',
            'Green',
            'Yellow',
            'Purple'
        ],
    });
    return handleAnswer(answers.question_1 === 'Blue');
}

async function handleAnswer(isCorrect) {
    const spinner = createSpinner('Checking answer...').start();
    await sleep(1000);
    spinner.success({ text: isCorrect ? 'Correct!' : 'Wrong answer!' });
    
    if (isCorrect) {
        console.log(chalk.green('You got it right!'));
    } else {
        console.log(chalk.red('Better luck next time!'));
        process.exit(1);
    }
    
}
await askQuestion();

function showBanner() {
    const banner = figlet.textSync('Whisper', {
        font: 'Ghost',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    });
    console.log(chalk.cyan(banner));
}

showBanner();