import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity VM environment
const mockVM = {
  txSender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  blockHeight: 100,
  contractCalls: {},
  storage: {
    creations: {},
    creationIdsByCreator: {}
  }
};

// Mock contract functions
const creationRegistry = {
  'register-creation': (creationId, title, description, contentHash, category) => {
    // Check if creation already exists
    if (mockVM.storage.creations[creationId]) {
      return { err: 101 }; // ERR_ALREADY_REGISTERED
    }
    
    // Insert the creation
    mockVM.storage.creations[creationId] = {
      creator: mockVM.txSender,
      title,
      description,
      'content-hash': contentHash,
      timestamp: mockVM.blockHeight,
      category
    };
    
    // Update creator's list of creation IDs
    if (!mockVM.storage.creationIdsByCreator[mockVM.txSender]) {
      mockVM.storage.creationIdsByCreator[mockVM.txSender] = { ids: [] };
    }
    mockVM.storage.creationIdsByCreator[mockVM.txSender].ids.push(creationId);
    
    return { ok: creationId };
  },
  
  'get-creation': (creationId) => {
    return mockVM.storage.creations[creationId] || null;
  },
  
  'update-creation-details': (creationId, title, description, category) => {
    const creation = mockVM.storage.creations[creationId];
    
    // Check if creation exists
    if (!creation) {
      return { err: 102 }; // ERR_NOT_FOUND
    }
    
    // Check if sender is the creator
    if (creation.creator !== mockVM.txSender) {
      return { err: 100 }; // ERR_NOT_AUTHORIZED
    }
    
    // Update the creation details
    mockVM.storage.creations[creationId] = {
      ...creation,
      title,
      description,
      category
    };
    
    return { ok: true };
  }
};

describe('Creation Registry Contract', () => {
  beforeEach(() => {
    // Reset the mock VM state before each test
    mockVM.storage.creations = {};
    mockVM.storage.creationIdsByCreator = {};
    mockVM.txSender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    mockVM.blockHeight = 100;
  });
  
  describe('register-creation', () => {
    it('should register a new creation successfully', () => {
      const creationId = 'test-creation-1';
      const title = 'Test Creation';
      const description = 'This is a test creation';
      const contentHash = Buffer.from('test-hash');
      const category = 'test';
      
      const result = creationRegistry['register-creation'](
          creationId, title, description, contentHash, category
      );
      
      expect(result).toEqual({ ok: creationId });
      expect(mockVM.storage.creations[creationId]).toBeDefined();
      expect(mockVM.storage.creations[creationId].title).toBe(title);
      expect(mockVM.storage.creations[creationId].creator).toBe(mockVM.txSender);
    });
    
    it('should fail to register a creation that already exists', () => {
      const creationId = 'test-creation-2';
      const title = 'Test Creation';
      const description = 'This is a test creation';
      const contentHash = Buffer.from('test-hash');
      const category = 'test';
      
      // Register the creation first time
      creationRegistry['register-creation'](
          creationId, title, description, contentHash, category
      );
      
      // Try to register again with the same ID
      const result = creationRegistry['register-creation'](
          creationId, 'New Title', 'New Description', Buffer.from('new-hash'), 'new-category'
      );
      
      expect(result).toEqual({ err: 101 }); // ERR_ALREADY_REGISTERED
    });
  });
  
  describe('get-creation', () => {
    it('should return creation details for a registered creation', () => {
      const creationId = 'test-creation-3';
      const title = 'Test Creation';
      const description = 'This is a test creation';
      const contentHash = Buffer.from('test-hash');
      const category = 'test';
      
      // Register the creation
      creationRegistry['register-creation'](
          creationId, title, description, contentHash, category
      );
      
      // Get the creation details
      const result = creationRegistry['get-creation'](creationId);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(title);
      expect(result.description).toBe(description);
      expect(result.category).toBe(category);
    });
    
    it('should return null for a non-existent creation', () => {
      const result = creationRegistry['get-creation']('non-existent-id');
      expect(result).toBeNull();
    });
  });
  
  describe('update-creation-details', () => {
    it('should update creation details successfully', () => {
      const creationId = 'test-creation-4';
      const title = 'Test Creation';
      const description = 'This is a test creation';
      const contentHash = Buffer.from('test-hash');
      const category = 'test';
      
      // Register the creation
      creationRegistry['register-creation'](
          creationId, title, description, contentHash, category
      );
      
      // Update the creation details
      const newTitle = 'Updated Title';
      const newDescription = 'Updated Description';
      const newCategory = 'updated';
      
      const result = creationRegistry['update-creation-details'](
          creationId, newTitle, newDescription, newCategory
      );
      
      expect(result).toEqual({ ok: true });
      
      // Verify the update
      const updatedCreation = creationRegistry['get-creation'](creationId);
      expect(updatedCreation.title).toBe(newTitle);
      expect(updatedCreation.description).toBe(newDescription);
      expect(updatedCreation.category).toBe(newCategory);
      // Content hash should remain unchanged
      expect(updatedCreation['content-hash']).toEqual(contentHash);
    });
    
    it('should fail to update a non-existent creation', () => {
      const result = creationRegistry['update-creation-details'](
          'non-existent-id', 'Title', 'Description', 'Category'
      );
      
      expect(result).toEqual({ err: 102 }); // ERR_NOT_FOUND
    });
    
    it('should fail to update a creation if not the creator', () => {
      const creationId = 'test-creation-5';
      const title = 'Test Creation';
      const description = 'This is a test creation';
      const contentHash = Buffer.from('test-hash');
      const category = 'test';
      
      // Register the creation
      creationRegistry['register-creation'](
          creationId, title, description, contentHash, category
      );
      
      // Change the tx sender
      const originalSender = mockVM.txSender;
      mockVM.txSender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
      
      // Try to update the creation
      const result = creationRegistry['update-creation-details'](
          creationId, 'New Title', 'New Description', 'New Category'
      );
      
      expect(result).toEqual({ err: 100 }); // ERR_NOT_AUTHORIZED
      
      // Restore the original sender
      mockVM.txSender = originalSender;
    });
  });
});
