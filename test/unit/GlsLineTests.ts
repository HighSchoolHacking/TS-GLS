import { expect } from "chai";
import "mocha";

import { GlsLine } from "../../lib/glsLine";

describe("GlsLine", () => {
    describe("toString", () => {
        it("prints just a command name when there are no args", () => {
            // Arrange
            const line = new GlsLine("command");

            // Act
            const printed = line.toString();

            // Assert
            expect(printed).to.be.equal("command");
        });

        it("prints a single argument", () => {
            // Arrange
            const line = new GlsLine("command", "abc");

            // Act
            const printed = line.toString();

            // Assert
            expect(printed).to.be.equal("command : abc");
        });

        it("prints multiple arguments", () => {
            // Arrange
            const line = new GlsLine("command", "abc", "def");

            // Act
            const printed = line.toString();

            // Assert
            expect(printed).to.be.equal("command : abc def");
        });

        it("wraps arguments that include spaces", () => {
            // Arrange
            const line = new GlsLine("command", "abc def", "ghi", "jkl mno");

            // Act
            const printed = line.toString();

            // Assert
            expect(printed).to.be.equal("command : (abc def) ghi (jkl mno)");
        });
    });
});
