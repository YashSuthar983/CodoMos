#!/usr/bin/env python3
"""
Debug script to check Project and User IDs in the database
Run from backend directory: python3 debug_ids.py
"""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def main():
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["cogniwork"]
    
    # Check projects
    print("=" * 60)
    print("PROJECTS IN DATABASE:")
    print("=" * 60)
    projects = await db.projects.find().to_list(length=100)
    for p in projects:
        print(f"ID: {p['_id']} (type: {type(p['_id']).__name__})")
        print(f"Name: {p.get('name', 'N/A')}")
        print(f"Members: {len(p.get('members', []))}")
        for m in p.get('members', []):
            print(f"  - Member user_id: {m.get('user_id')} (type: {type(m.get('user_id')).__name__})")
        print()
    
    # Check users
    print("=" * 60)
    print("USERS IN DATABASE:")
    print("=" * 60)
    users = await db.users.find().to_list(length=100)
    for u in users:
        print(f"ID: {u['_id']} (type: {type(u['_id']).__name__})")
        print(f"Email: {u.get('email', 'N/A')}")
        print(f"Name: {u.get('full_name', 'N/A')}")
        print()
    
    client.close()
    print("=" * 60)
    print("SUMMARY:")
    print(f"Total Projects: {len(projects)}")
    print(f"Total Users: {len(users)}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
