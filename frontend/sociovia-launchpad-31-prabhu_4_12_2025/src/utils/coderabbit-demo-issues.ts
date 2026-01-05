// Demo file to show CodeRabbit's review capabilities
// This file intentionally has issues for CodeRabbit to find

export function processUserData(users) {
    // Issue 1: No TypeScript types
    let result = [];

    // Issue 2: Using var instead of const/let
    var count = 0;

    for (var i = 0; i < users.length; i++) {
        // Issue 3: Using var in loop (hoisting issue)
        var user = users[i];

        // Issue 4: No null check
        if (user.status == "active") {  // Issue 5: Using == instead of ===
            // Issue 6: console.log in production code
            console.log("Processing user: " + user.name);

            result.push({
                id: user.id,
                name: user.name,
                email: user.email
            });
            count++;
        }
    }

    // Issue 7: Unused variable
    var totalProcessed = count;

    return result;
}

// Issue 8: Function with too many parameters
export function createUser(name, email, password, age, address, phone, company, role, department, team) {
    return {
        name: name,
        email: email,
        password: password,  // Issue 9: Storing plain text password
        age: age,
        address: address,
        phone: phone,
        company: company,
        role: role,
        department: department,
        team: team,
        createdAt: new Date()
    };
}

// Issue 10: Async function without proper error handling
export async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

// Issue 11: Potential SQL injection (if this were backend)
export function buildQuery(userId) {
    return `SELECT * FROM users WHERE id = ${userId}`;
}

// Issue 12: Magic numbers without explanation
export function calculateDiscount(price) {
    if (price > 1000) {
        return price * 0.15;
    } else if (price > 500) {
        return price * 0.10;
    }
    return price * 0.05;
}
