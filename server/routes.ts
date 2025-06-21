import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { z } from "zod";

// Type định nghĩa cho người dùng đã xác thực
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      fullName: string;
      role: string;
    }
  }
}

// Hàm khởi tạo passport
function initializePassport(app: Express) {
  // Sử dụng Local Strategy để xác thực người dùng
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Tài khoản không tồn tại" });
        }

        const isValid = await storage.validatePassword(user, password);
        if (!isValid) {
          return done(null, false, { message: "Mật khẩu không chính xác" });
        }

        // Cập nhật thời gian đăng nhập cuối
        await storage.updateUser(user.id, { lastLogin: new Date() });

        // Chỉ trả về thông tin cần thiết, không bao gồm password
        return done(null, {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role
        });
      } catch (error) {
        return done(error);
      }
    })
  );

  // Lưu thông tin người dùng vào session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Lấy thông tin người dùng từ session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      // Chỉ trả về thông tin cần thiết
      done(null, {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      });
    } catch (error) {
      done(error);
    }
  });

  // Cấu hình session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 ngày
        secure: process.env.NODE_ENV === "production"
      }
    })
  );

  // Khởi tạo Passport
  app.use(passport.initialize());
  app.use(passport.session());
}

// Middleware kiểm tra quyền admin
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }

  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Không có quyền thực hiện" });
  }

  next();
}

// Middleware kiểm tra đã đăng nhập
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Khởi tạo Passport
  initializePassport(app);

  // Endpoint đăng nhập
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ 
      success: true, 
      user: req.user 
    });
  });

  // Endpoint đăng xuất
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Lỗi khi đăng xuất" });
      }
      res.json({ success: true });
    });
  });

  // Endpoint kiểm tra trạng thái đăng nhập
  app.get("/api/auth/status", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ 
        isAuthenticated: true, 
        user: req.user 
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

  // Endpoint đăng ký người dùng mới (chỉ admin)
  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      // Validate dữ liệu đầu vào
      const userSchema = insertUserSchema.extend({
        confirmPassword: z.string()
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Mật khẩu xác nhận không khớp",
        path: ["confirmPassword"],
      });
      
      const userData = userSchema.parse(req.body);
      
      // Kiểm tra xem username đã tồn tại chưa
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
      }
      
      // Tạo người dùng mới
      const newUser = await storage.createUser(userData);
      
      // Không trả về mật khẩu
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Lỗi khi tạo người dùng:", error);
        res.status(500).json({ error: "Lỗi khi tạo người dùng" });
      }
    }
  });

  // Endpoint lấy danh sách người dùng (chỉ admin)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.listUsers();
      // Loại bỏ password khỏi response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách người dùng:", error);
      res.status(500).json({ error: "Lỗi khi lấy danh sách người dùng" });
    }
  });

  // Endpoint cập nhật thông tin người dùng
  app.put("/api/users/:id", isAuthenticated, async (req, res) => {
    const userId = parseInt(req.params.id);
    
    // Chỉ admin hoặc chính người dùng đó mới có thể cập nhật
    if (req.user?.id !== userId && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Không có quyền thực hiện" });
    }
    
    try {
      const updateData = req.body;
      
      // Nếu không phải admin mà cố thay đổi role
      if (req.user?.role !== "admin" && updateData.role) {
        delete updateData.role;
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Không tìm thấy người dùng" });
      }
      
      // Không trả về mật khẩu
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Lỗi khi cập nhật người dùng:", error);
      res.status(500).json({ error: "Lỗi khi cập nhật người dùng" });
    }
  });

  // Endpoint xóa người dùng (chỉ admin)
  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    
    // Không cho phép xóa chính mình
    if (req.user?.id === userId) {
      return res.status(400).json({ error: "Không thể xóa tài khoản đang sử dụng" });
    }
    
    try {
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ error: "Không tìm thấy người dùng" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      res.status(500).json({ error: "Lỗi khi xóa người dùng" });
    }
  });

  // Endpoint tạo tài khoản admin đầu tiên (chỉ sử dụng nếu chưa có admin nào)
  app.post("/api/setup/admin", async (req, res) => {
    try {
      // Kiểm tra xem đã có admin nào chưa
      const users = await storage.listUsers();
      const adminExists = users.some(user => user.role === "admin");
      
      if (adminExists) {
        return res.status(400).json({ error: "Admin đã tồn tại" });
      }
      
      // Validate dữ liệu đầu vào
      const adminSchema = insertUserSchema.extend({
        confirmPassword: z.string()
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Mật khẩu xác nhận không khớp",
        path: ["confirmPassword"],
      });
      
      const adminData = adminSchema.parse(req.body);
      
      // Tạo tài khoản admin
      const admin = await storage.createUser({
        ...adminData,
        role: "admin"
      });
      
      // Không trả về mật khẩu
      const { password, ...adminWithoutPassword } = admin;
      res.status(201).json(adminWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Lỗi khi tạo tài khoản admin:", error);
        res.status(500).json({ error: "Lỗi khi tạo tài khoản admin" });
      }
    }
  });

  // Supabase integration endpoints
  app.post('/api/test-supabase-connection', async (req, res) => {
    try {
      const { databaseUrl } = req.body;
      
      if (!databaseUrl) {
        return res.status(400).json({ error: 'Database URL is required' });
      }

      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: databaseUrl });
      
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      res.status(500).json({ error: 'Connection failed' });
    }
  });

  app.post('/api/initialize-supabase-db', async (req, res) => {
    try {
      const { databaseUrl } = req.body;
      
      if (!databaseUrl) {
        return res.status(400).json({ error: 'Database URL is required' });
      }

      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: databaseUrl });
      
      const client = await pool.connect();
      
      // Create tables if they don't exist
      const createTables = `
        CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(255),
          address TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vehicles (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          customer_id INTEGER REFERENCES customers(id),
          license_plate VARCHAR(20) NOT NULL,
          brand VARCHAR(100),
          model VARCHAR(100),
          year INTEGER,
          color VARCHAR(50),
          engine_number VARCHAR(100),
          chassis_number VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS inventory_categories (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS inventory_items (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          category_id INTEGER REFERENCES inventory_categories(id),
          unit VARCHAR(20),
          quantity INTEGER DEFAULT 0,
          unit_price DECIMAL(10,2),
          supplier VARCHAR(255),
          location VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS services (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          unit_price DECIMAL(10,2),
          estimated_time INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS quotations (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          customer_id INTEGER REFERENCES customers(id),
          vehicle_id INTEGER REFERENCES vehicles(id),
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_expected TIMESTAMP,
          status VARCHAR(20) DEFAULT 'pending',
          notes TEXT,
          subtotal DECIMAL(10,2) DEFAULT 0,
          tax DECIMAL(10,2),
          total DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS quotation_items (
          id SERIAL PRIMARY KEY,
          quotation_id INTEGER REFERENCES quotations(id),
          item_id INTEGER,
          item_type VARCHAR(20),
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10,2),
          total DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS repair_orders (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          quotation_id INTEGER REFERENCES quotations(id),
          customer_id INTEGER REFERENCES customers(id),
          vehicle_id INTEGER REFERENCES vehicles(id),
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_expected TIMESTAMP,
          odometer INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending',
          notes TEXT,
          subtotal DECIMAL(10,2) DEFAULT 0,
          tax DECIMAL(10,2),
          total DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS repair_order_items (
          id SERIAL PRIMARY KEY,
          repair_order_id INTEGER REFERENCES repair_orders(id),
          item_id INTEGER,
          item_type VARCHAR(20),
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10,2),
          total DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invoices (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          repair_order_id INTEGER REFERENCES repair_orders(id),
          customer_id INTEGER REFERENCES customers(id),
          vehicle_id INTEGER REFERENCES vehicles(id),
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'pending',
          notes TEXT,
          subtotal DECIMAL(10,2) DEFAULT 0,
          discount DECIMAL(10,2),
          tax DECIMAL(10,2),
          total DECIMAL(10,2) DEFAULT 0,
          amount_paid DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await client.query(createTables);
      client.release();
      await pool.end();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Supabase database initialization failed:', error);
      res.status(500).json({ error: 'Database initialization failed' });
    }
  });

  app.post('/api/sync-to-supabase', async (req, res) => {
    try {
      const { databaseUrl, tables } = req.body;
      
      if (!databaseUrl || !tables) {
        return res.status(400).json({ error: 'Database URL and tables are required' });
      }

      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: databaseUrl });
      const client = await pool.connect();

      for (const table of tables) {
        const { tableName, data } = table;
        
        if (!data || data.length === 0) continue;

        // Clear existing data
        await client.query(`DELETE FROM ${tableName}`);

        // Insert new data
        const columns = Object.keys(data[0]).filter(key => key !== 'id');
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        for (const row of data) {
          const values = columns.map(col => row[col]);
          await client.query(insertQuery, values);
        }
      }

      client.release();
      await pool.end();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Supabase sync failed:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  app.post('/api/load-from-supabase', async (req, res) => {
    try {
      const { databaseUrl } = req.body;
      
      if (!databaseUrl) {
        return res.status(400).json({ error: 'Database URL is required' });
      }

      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: databaseUrl });
      const client = await pool.connect();

      const result = {};
      const tables = [
        'customers', 'vehicles', 'inventory_categories', 'inventory_items',
        'services', 'quotations', 'quotation_items', 'repair_orders', 
        'repair_order_items', 'invoices'
      ];

      for (const table of tables) {
        const { rows } = await client.query(`SELECT * FROM ${table} ORDER BY id`);
        result[table.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] = rows;
      }

      client.release();
      await pool.end();
      
      res.json(result);
    } catch (error) {
      console.error('Supabase load failed:', error);
      res.status(500).json({ error: 'Load failed' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
