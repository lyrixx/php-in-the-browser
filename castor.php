<?php

// The slides of the talk: public/ is served as it is, and the PHP that runs in
// them is built by php-wasm-builder, in public/build/.

use Castor\Attribute\AsOption;
use Castor\Attribute\AsTask;
use Castor\Exception\ProblemException;
use PhpWasm\Stack;
use Symfony\Component\Console\Input\InputOption;

use function Castor\check;
use function Castor\context;
use function Castor\io;
use function Castor\run;
use function PhpWasm\build;
use function PhpWasm\check_stack;
use function PhpWasm\run_code;

defined('CASTOR_USE_CHDIR') || define('CASTOR_USE_CHDIR', true);

/**
 * The default stack of php-wasm-builder: the one the slides talk about (its
 * size, its extensions in the playground).
 */
function wasm_stack(): Stack
{
    return Stack::named('slides')
        ->php('8.5.12')
        ->extensions('calendar', 'ctype', 'dom', 'mbstring', 'simplexml', 'xml', 'xmlreader', 'xmlwriter')
        ->targets('web')
        ->outputDir('public/build');
}

#[AsTask('build', namespace: 'wasm', description: 'Builds the PHP of the slides as WebAssembly, in public/build/')]
function wasm_build(
    #[AsOption(description: 'Given to "docker buildx bake --set", for a cache', mode: InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY)]
    array $set = [],
): void {
    build([wasm_stack()], $set);
}

#[AsTask('smoke', namespace: 'wasm', description: 'Checks that the PHP of the slides boots, and runs their code')]
function wasm_smoke(): void
{
    check_stack(wasm_stack());

    // What the slide of the API runs
    check('PHP reads its stdin', 'PHP does not read its stdin.', fn (): bool => 'Salut' === run_code(wasm_stack(), 'echo ucfirst(file_get_contents("php://stdin"));', stdin: 'salut'));
}

#[AsTask('serve', namespace: 'slides', description: 'Serves the slides on 127.0.0.1, after building their PHP if it is not built yet')]
function slides_serve(
    #[AsOption(description: 'The port to listen to')]
    int $port = 8000,
): int {
    io()->title('Serving the slides');

    // The built-in server only says it once started
    if (false !== $socket = @fsockopen('127.0.0.1', $port, timeout: 1)) {
        fclose($socket);

        throw new ProblemException(\sprintf('Something already listens to the port %d: give another one, with --port %d for example.', $port, $port + 1));
    }

    // Not built again when it is there: the slides work without Docker, and
    // without network, on the day of the talk
    if (array_filter(wasm_stack()->artifacts(), fn (string $file): bool => !is_file($file))) {
        wasm_build();
    }

    io()->success([
        "The slides are on http://127.0.0.1:{$port}/, and in English on http://127.0.0.1:{$port}/?lang=en",
        'P opens the presenter view, N shows the notes, L switches the language. Ctrl+C stops the server.',
        'castor wasm:build builds PHP again, after a change of wasm_stack().',
    ]);

    return run(['php', '-S', "127.0.0.1:{$port}", '-t', __DIR__ . '/public'], context: context()->withAllowFailure())->getExitCode();
}
