// PreToolUse hook: rejects shell commands that start with cd, which trigger approval prompts even in auto mode
let input = ''
process.stdin.on('data', (chunk) => {
  input += chunk
})
process.stdin.on('end', () => {
  const command = JSON.parse(input).tool_input?.command ?? ''
  // A leading cd makes paths "computed at run time" for blockReadsOutsideWorkingDirectories
  if (/^\s*(cd|Set-Location|sl|pushd)\s/i.test(command)) {
    process.stderr.write('Do not prefix commands with cd: the working directory is already the project. Rerun without it, using relative or absolute paths.')
    process.exit(2)
  }
  process.exit(0)
})
