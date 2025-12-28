const { Schema, Table, column } = require('@powersync/node');

console.log('Table constructor:', Table);
console.log('Schema constructor:', Schema);

try {
    const t = new Table({
        name: column.text
    });
    console.log('Table instance created:', t);
    console.log('Has copyWithName:', typeof t.copyWithName);

    if (typeof t.copyWithName !== 'function') {
        console.error('FAIL: copyWithName is missing!');

        // Inspect prototype
        console.log('Prototype:', Object.getPrototypeOf(t));
        console.log('Prototype property names:', Object.getOwnPropertyNames(Object.getPrototypeOf(t)));
    } else {
        console.log('PASS: copyWithName exists.');
    }

    console.log('Creating Schema...');
    const s = new Schema({
        test: new Table({ name: column.text })
    });
    console.log('Schema created successfully');

} catch (e) {
    console.error('CRASH:', e);
}
