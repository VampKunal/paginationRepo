const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get("/", async (req, res) => {
    try {
        const limit = Math.min(
            100,
            Math.max(1, Number(req.query.limit) || 20)
        );

        let cursorCreatedAt = null;
        let cursorId = null;

        if (req.query.cursor) {
            try {
                const decoded = JSON.parse(Buffer.from(req.query.cursor, 'base64').toString('utf-8'));
                cursorCreatedAt = decoded.createdAt;
                cursorId = decoded.id;
            } catch (e) {
                return res.status(400).json({ message: "Invalid cursor" });
            }
        }

        const category = req.query.category;

        const allowedCategories = [
            "Electronics",
            "Books",
            "Clothing",
            "Sports",
            "Home",
        ];

        if (
            category &&
            !allowedCategories.includes(category)
        ) {
            return res.status(400).json({
                message: "Invalid category",
            });
        }

        let result;

        // FIRST PAGE + NO CATEGORY
        if (!cursorCreatedAt && !cursorId && !category) {
            result = await pool.query(
                `
        SELECT *
        FROM products
        ORDER BY created_at DESC, id DESC
        LIMIT $1
        `,
                [limit]
            );
        }

        // FIRST PAGE + CATEGORY
        else if (!cursorCreatedAt && !cursorId && category) {
            result = await pool.query(
                `
        SELECT *
        FROM products
        WHERE category = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2
        `,
                [category, limit]
            );
        }

        // CURSOR + NO CATEGORY
        else if (cursorCreatedAt && cursorId && !category) {
            result = await pool.query(
                `
        SELECT *
        FROM products
        WHERE (created_at, id) < ($1, $2)
        ORDER BY created_at DESC, id DESC
        LIMIT $3
        `,
                [cursorCreatedAt, cursorId, limit]
            );
        }

        // CURSOR + CATEGORY
        else {
            result = await pool.query(
                `
        SELECT *
        FROM products
        WHERE category = $1
        AND (created_at, id) < ($2, $3)
        ORDER BY created_at DESC, id DESC
        LIMIT $4
        `,
                [
                    category,
                    cursorCreatedAt,
                    cursorId,
                    limit,
                ]
            );
        }

        const products = result.rows;

        let nextCursor = null;

        if (products.length > 0) {
            const lastProduct =
                products[products.length - 1];

            const cursorObj = {
                createdAt: lastProduct.created_at,
                id: lastProduct.id,
            };
            nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
        }

        return res.json({
            products,
            nextCursor,
            hasMore: products.length === limit,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
});

router.post("/", async (req, res) => {
    try {
        const { name, category, price } = req.body;
        if (!name || !category || !price) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const result = await pool.query(
            "INSERT INTO products (name, category, price, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *",
            [name, category, price]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price } = req.body;

        const result = await pool.query(
            "UPDATE products SET name = $1, category = $2, price = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
            [name, category, price, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "DELETE FROM products WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        return res.json({ message: "Product deleted", product: result.rows[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;