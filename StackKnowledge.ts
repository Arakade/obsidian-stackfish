export class StackKnowledge {
	/**
	 * Process input text, converting any lines that match a stack trace to a mermaid flowchart.
	 *
	 * Example input stack trace input looks like:
	 *
	 * ```
	 * cooperation.model.levels.CoOperationLevelDefinition.getStartingPositionForPlayer (System.Int32 playerNum) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelDefinition.cs:226)
	 * cooperation.model.levels.CoOperationLevelDefinition.getPlayerAndStartingPosition (System.Int32 playerNum, System.Int32 characterNum) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelDefinition.cs:236)
	 * cooperation.model.CoOperationLevelRuntime.addPlayerAsync (System.String playerName, System.Int32 playerNumber, System.Int32 characterIndex) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelRuntime.cs:41)
	 * cooperation.model.multiturn.GameManager+<addPlayersAsync>d__26.MoveNext () (at Assets/_CoOPERATION/03Code/model/game/GameManager.cs:316)
	 * ```
	 *
	 * Output would then look like:
	 *
	 * ```
	 * \```mermaid
	 * flowchart LR
	 *   subgraph CoOperationLevelDefinition
	 *     COLD.gSPFP("getStartingPositionForPlayer()")
	 *     COLD.gPASP("getPlayerAndStartingPosition()")
	 *   end
	 *
	 *   subgraph CoOperationLevelRuntime
	 *     COLR.aPA("addPlayerAsync()")
	 *   end
	 *
	 *   subgraph GameManager
	 *     GM.aPA("addPlayersAsync()")
	 *   end
	 *
	 *   GM.aPA --> COLR.aPA
	 *   COLR.aPA --> COLD.gPASP
	 *   COLD.gPASP --> COLD.gSPFP
	 * \```
	 * ```
	 *
	 * Note the async method (with `<>`) is handled specially, extracting the method name from the angle brackets.
	 *
	 * @param stackText Input text to process.
	 * @returns Output text with any stack trace lines converted to mermaid flowchart.
	 */
	processStack(stackText: string): void {
		const stackLines = stackText.split('\n');
		const ignoreRegex = buildCombinedRegex();
		// console.debug(`StackKnowledge.processStack: stackLines.length=${stackLines.length}`)
		for (let i = 0; i < stackLines.length; i++) {
			// Ignore lines that match the ignore list
			if (ignoreRegex.test(stackLines[i])) {
				// console.debug(`StackKnowledge.processStack: Ignoring line ${i}: ${stackLines[i]}`);
				continue;
			}

			// Check whether matches a stack line
			const result = extractClassAndMethod(stackLines[i]);
			if (result) {
				const [className, methodName] = result;
				this.addStackEntry(className, methodName);
				continue; // in case we add more processing later
			}

			// If we get here, we didn't match a stack line
			console.debug(`StackKnowledge.processStack: No stack line matched on line ${i}: ${stackLines[i]}`);
		}
	}

	private addStackEntry(className: string, methodName: string): void {
		// If we already have a class definition, check whether it already has this method or add if not.
		let classDefinition = this.classes.find(classDefinition => classDefinition.name === className);
		let methodDefinition: MethodDefinition | undefined;
		if (classDefinition) {
			// If method is not in class, add method to class
			methodDefinition = classDefinition.methods.find(methodDefinition => methodDefinition.name === methodName);
			if (!methodDefinition) {
				methodDefinition = new MethodDefinition(methodName);
				classDefinition.methods.push(methodDefinition);
			} // else (already in class, all done for this line)
		} else { // else (class is not in classes) => create class and add method to class
			methodDefinition = new MethodDefinition(methodName);
			classDefinition = new ClassDefinition(className, [methodDefinition]);
			this.classes.push(classDefinition);
		}

		// Add stack entry
		const stackEntry = new StackEntry(classDefinition, methodDefinition);
		this.stackEntries.push(stackEntry);

		// console.debug(`StackKnowledge.processStack: Added stack entry: ${stackEntry}`);
	}

	dumpAsMermaidFlowchart(): string {
		const outputArray: string[] = [];

		outputArray.push('```mermaid')
		outputArray.push('flowchart LR');
		// Go through classes and methods to create subgraphs
		for (const classDefinition of this.classes) {
			const classId = classDefinition.toMermaidId();
			outputArray.push(`  subgraph ${classDefinition.name}`);
			for (const methodDefinition of classDefinition.methods) {
				const methodId = methodDefinition.toMermaidId();
				outputArray.push(`    ${classId}.${methodId}("${methodDefinition.name}()")`);
			}
			outputArray.push('  end');
		}

		// Go through stack entries backwards to create links
		for (let i = this.stackEntries.length - 1; i >= 0; i--) {
			const id = this.stackEntries[i].toMermaidId();
			if (i > 0) {
				outputArray.push(`  ${id} -->`);
			} else {
				outputArray.push(`  ${id}`);
			}
		}

		outputArray.push('```')

		return outputArray.join('\n');
	}

	readonly stackEntries: StackEntry[] = [];
	readonly classes: ClassDefinition[] = [];
	// readonly stackLines: StackLine[] = []; // TODO: unused


	// static readonly StackRegex = /(?<namespace>[_a-zA-Z0-9\.]+)\.(?<class>[_a-zA-Z0-9]+)\.(?<method>[_a-zA-Z0-9]+)\s*\((?<parameters>[a-zA-Z0-9, ]+)\)\s*\((?<file>[a-zA-Z0-9\/._]+):(?<line>[0-9]+)\)/;
	//static readonly StackRegex = /(?<namespace>([_a-zA-Z0-9\\.]+?)+)\.(?<class>[_a-zA-Z0-9]+?)\.(?<method>[_a-zA-Z0-9]+)\s*(?<theRest>.*)$/ ; // \((?<parameters>[a-zA-Z0-9, ]+)\)\s*\((?<file>[a-zA-Z0-9\/._]+):(?<line>[0-9]+)\)/;
	// TODO: Async regex
}

/*
class StackLine { // TODO: Unused
	readonly namespace: string;
	readonly className: string;
	readonly methodName: string;

	readonly parameters?: string;
	readonly file?: string;
	readonly line?: number;

	constructor(namespace: string, className: string, methodName: string, parameters?: string, file?: string, line?: number) {
		this.namespace = namespace;
		this.className = className;
		this.methodName = methodName;
		this.parameters = parameters;
		this.file = file;
		this.line = line;
	}

	toString(): string {
		return `${this.namespace}.${this.className}.${this.methodName}(${this.parameters}) (${this.file}:${this.line})`;
	}
}
*/

class StackEntry {
	readonly classDefinition: ClassDefinition;
	readonly methodDefinition: MethodDefinition;

	constructor(classDefinition: ClassDefinition, methodDefinition: MethodDefinition) {
		this.classDefinition = classDefinition;
		this.methodDefinition = methodDefinition;
	}

	toMermaidId(): string {
		return `${this.classDefinition.toMermaidId()}.${this.methodDefinition.toMermaidId()}`;
	}

	toString(): string {
		return `${this.classDefinition}.${this.methodDefinition}`;
	}
}

class MethodDefinition {
	readonly name: string;

	constructor(name: string) {
		this.name = name;
	}

	toMermaidId(): string {
		return convertNameToMermaidId(this.name);
	}

	toString(): string {
		return `${this.name}()`;
	}
}

class ClassDefinition {
	readonly name: string;
	readonly methods: MethodDefinition[];

	constructor(name: string, methods: MethodDefinition[] = []) {
		this.name = name;
		this.methods = methods;
	}

	toMermaidId(): string {
		return convertNameToMermaidId(this.name);
	}

	toString(): string {
		return this.name;
	}
}

/**
 * Convert a name to a mermaid id.
 * Outputs an id consisting of the first letter followed by each capital letter.
 * @param name Input name to be converted.
 */
function convertNameToMermaidId(name: string): string {
	if (0 == name.length)
		throw new Error(`convertNameToMermaidId(): name is empty`);

	let output = name.charAt(0);
	for (let i = 1; i < name.length; i++) {
		const char = name.charAt(i);
		if (' ' !== char && char === char.toUpperCase()) {
			output += char;
		}
	}
	// console.debug(`convertNameToMermaidId(): name="${name}", output="${output}"`);
	return output;
}

/**
 * Extract class and method from a stack line.
 * Note the async method (with `<>`) is handled specially, extracting the method name from the angle brackets.
 * @param string
 */
function extractClassAndMethod(string: string): ([string, string] | undefined) {
	const index = string.indexOf('(');
	if (index < 0)
		return undefined;

	const isAsync = -1 !== string.indexOf('MoveNext');
	if (isAsync) {
		const angleStart = string.indexOf('<');
		const angleEnd = string.indexOf('>', angleStart);
		if (angleStart < 0 || angleEnd < 0)
			return undefined;

		const methodName = string.substring(angleStart + 1, angleEnd);
		const namespaceAndClass = string.substring(0, angleStart - 1);
		const parts = namespaceAndClass.split(/[.:]/);
		if (parts.length < 2)
			return undefined;

		const className = parts[parts.length - 1].trim();
		return [className, methodName];
	} else {
		const namespaceAndClass = string.substring(0, index);
		const parts = namespaceAndClass.split(/[.:]/);
		if (parts.length < 2)
			return undefined;

		const className = parts[parts.length - 2].trim();
		const methodName = parts[parts.length - 1].trim();

		return [className, methodName];
	}
}

/* Unused
export function getIdentifierTo(input: string, finalChar: string, startIndex: number = 0): string {
	const index = input.indexOf(finalChar, startIndex);
	if (index < 0)
		throw new Error(`getIdentifierTo: Could not find ${finalChar} in ${input}`);

	return input.substring(startIndex, index);
}
*/

const DefaultCSharpIgnoreList = [
	/location/,
	/ExceptionServices/,
	/CompilerServices/,
	/NUnit\.Framework\.Internal/,
	/^ExecutionContext./,
	/^AsyncMethodBuilderCore./,
	/^AwaitTaskContinuation./,
	/^Task./,
	/^AsyncTaskMethodBuilder</,
	/^AsyncTaskMethodBuilder.SetResult/,
	/^TimerQueue/,
	/^\[/,
	/^System\.Threading\.[^ ]*\(FinishStageThree/,
	/FinishContinuations/,
	/SynchronizationContextAwaitTaskContinuation/,
	/AwaitTaskContinuation/,
	/ExecutionContext\)/,
	/UnitySynchronizationContext/,
];
// 'location|ExceptionServices|CompilerServices|NUnit\.Framework\.Internal|^ExecutionContext.|^AsyncMethodBuilderCore.|^AwaitTaskContinuation.|^Task.|^AsyncTaskMethodBuilder<|^AsyncTaskMethodBuilder.SetResult|^TimerQueue|^\[|^System\.Threading\.[^ ]*(FinishStageThree|FinishContinuations|SynchronizationContextAwaitTaskContinuation|AwaitTaskContinuation|ExecutionContext)';

function buildCombinedRegex() {
	const regexes = DefaultCSharpIgnoreList.map(regex => regex.source);
	return new RegExp(regexes.join('|'));
}
