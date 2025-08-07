

--  Drop tables if they exist to start fresh
DROP TABLE IF EXISTS exam_answers;
DROP TABLE IF EXISTS exam_sessions;
DROP TABLE IF EXISTS questions;

--  Table to store the question bank
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer CHAR(1) NOT NULL
);

-- Table to track each exam attempt
CREATE TABLE exam_sessions (
    id SERIAL PRIMARY KEY,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_finished BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table to store the candidate's answers for a session
CREATE TABLE exam_answers (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES exam_sessions(id),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    submitted_answer CHAR(1) NOT NULL
);

INSERT INTO questions (text, options, correct_answer) VALUES
('What does `console.log` do in JavaScript?', '{"A": "Logs a message to the web console", "B": "Creates a new variable", "C": "Styles a component", "D": "Imports a library", "E": "None of the above"}', 'A'),
('Which of the following is NOT a primitive type in TypeScript?', '{"A": "string", "B": "number", "C": "boolean", "D": "array", "E": "null"}', 'D'),
('What keyword is used to declare a variable that cannot be reassigned?', '{"A": "let", "B": "var", "C": "const", "D": "static", "E": "final"}', 'C'),
('In Node.js, what object is used to manage environment variables?', '{"A": "process.env", "B": "window.env", "C": "document.env", "D": "node.config", "E": "system.vars"}', 'A'),
('Which HTTP method is typically used to create a new resource on a server?', '{"A": "GET", "B": "POST", "C": "UPDATE", "D": "DELETE", "E": "PATCH"}', 'B'),
('What is the purpose of the `await` keyword?', '{"A": "To declare an asynchronous function", "B": "To handle errors", "C": "To pause the execution of an async function until a Promise is settled", "D": "To run code in parallel", "E": "To define a callback"}', 'C'),
('What does ORM stand for?', '{"A": "Object-Related Mapping", "B": "Object-Relational Mapping", "C": "Operational-Resource Manager", "D": "Ordered-Record Model", "E": "Official-Routing Module"}', 'B'),
('Which of these is a popular framework for building Node.js applications?', '{"A": "React", "B": "Angular", "C": "Vue", "D": "Express.js", "E": "Django"}', 'D'),
('What file is the entry point for a Node.js package?', '{"A": "index.js", "B": "start.js", "C": "The file specified in the `main` property of package.json", "D": "app.js", "E": "node.js"}', 'C'),
('What does the `pg` library in Node.js allow you to do?', '{"A": "Parse command-line arguments", "B": "Interact with a PostgreSQL database", "C": "Create PDF documents", "D": "Manage file system operations", "E": "Build user interfaces"}', 'B');