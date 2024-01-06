import {getIdentifierTo, StackKnowledge} from './StackKnowledge';
import {expect} from 'chai';

describe('StackKnowledge', () => {
	let stackKnowledge: StackKnowledge;

	beforeEach(() => {
		stackKnowledge = new StackKnowledge();
	});

	describe('processStack', () => {
		it('should process valid stack trace text correctly', () => {
			const stackText = `cooperation.model.levels.CoOperationLevelDefinition.getStartingPositionForPlayer (System.Int32 playerNum) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelDefinition.cs:226)
      cooperation.model.levels.CoOperationLevelDefinition.getPlayerAndStartingPosition (System.Int32 playerNum, System.Int32 characterNum) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelDefinition.cs:236)
      cooperation.model.CoOperationLevelRuntime.addPlayerAsync (System.String playerName, System.Int32 playerNumber, System.Int32 characterIndex) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelRuntime.cs:41)
      cooperation.model.multiturn.GameManager+<addPlayersAsync>d__26.MoveNext () (at Assets/_CoOPERATION/03Code/model/game/GameManager.cs:316)`;

			stackKnowledge.processStack(stackText);

			expect(stackKnowledge.classes.length).to.equal(3);
			expect(stackKnowledge.stackEntries.length).to.equal(4);
		});

		it('should ignore invalid stack trace lines', () => {
			const stackText = `invalid line
      cooperation.model.levels.CoOperationLevelDefinition.getStartingPositionForPlayer (System.Int32 playerNum) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelDefinition.cs:226)`;

			stackKnowledge.processStack(stackText);

			expect(stackKnowledge.classes.length).to.equal(1);
			expect(stackKnowledge.stackEntries.length).to.equal(1);
		});

		it('should handle empty stack trace text', () => {
			const stackText = '';

			stackKnowledge.processStack(stackText);

			expect(stackKnowledge.classes.length).to.equal(0);
			expect(stackKnowledge.stackEntries.length).to.equal(0);
		});
	});

	describe('dumpAsMermaidFlowchart', () => {
		it('should return correct mermaid flowchart for processed stack trace', () => {
			const stackText = `cooperation.model.levels.CoOperationLevelDefinition.getStartingPositionForPlayer (System.Int32 playerNum) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelDefinition.cs:226)
      cooperation.model.levels.CoOperationLevelDefinition.getPlayerAndStartingPosition (System.Int32 playerNum, System.Int32 characterNum) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelDefinition.cs:236)
      cooperation.model.CoOperationLevelRuntime.addPlayerAsync (System.String playerName, System.Int32 playerNumber, System.Int32 characterIndex) (at Assets/_CoOPERATION/03Code/model/levels/CoOperationLevelRuntime.cs:41)
      cooperation.model.multiturn.GameManager+<addPlayersAsync>d__26.MoveNext () (at Assets/_CoOPERATION/03Code/model/game/GameManager.cs:316)`;

			stackKnowledge.processStack(stackText);
			const mermaidFlowchart = stackKnowledge.dumpAsMermaidFlowchart();

			expect(mermaidFlowchart).to.include('```mermaid');
			expect(mermaidFlowchart).to.include('flowchart LR');
			expect(mermaidFlowchart).to.include('subgraph CoOperationLevelDefinition');
			expect(mermaidFlowchart).to.include('cold.gspfp("getStartingPositionForPlayer()")');
			expect(mermaidFlowchart).to.include('cold.gpasp("getPlayerAndStartingPosition()")');
			expect(mermaidFlowchart).to.include('end');
			expect(mermaidFlowchart).to.include('```');
		});

		it('should return empty mermaid flowchart for empty stack trace', () => {
			const stackText = '';

			stackKnowledge.processStack(stackText);
			const mermaidFlowchart = stackKnowledge.dumpAsMermaidFlowchart();

			expect(mermaidFlowchart).to.equal('```mermaid\nflowchart LR\n```');
		});
	});
	describe('getIdentifierTo', () => {
		it('returns substring up to specified character', () => {
			const input = 'Hello, World!';
			const result = getIdentifierTo(input, ',');
			expect(result).to.equal('Hello');
		});

		it('returns substring up to specified character with custom start index', () => {
			const input = 'Hello, World!';
			const result = getIdentifierTo(input, '!', 7);
			expect(result).to.equal(' World');
		});

		it('throws error when specified character is not found', () => {
			const input = 'Hello, World!';
			expect(() => getIdentifierTo(input, '?')).to.throw();
		});

		it('returns empty string when start index is equal to input length', () => {
			const input = 'Hello, World!';
			const result = getIdentifierTo(input, '!', input.length);
			expect(result).to.equal('');
		});

		it('throws error when start index is greater than input length', () => {
			const input = 'Hello, World!';
			expect(() => getIdentifierTo(input, '!', input.length + 1)).to.throw();
		});
	});
});
