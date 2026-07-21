import { ReferenceFile, MinescriptFunction } from "./types";

export const DEFAULT_MINESCRIPT_CODE = `"""
minescript.py - Python module for interacting with Minecraft via Minescript.

This file acts as the official Python binding for the Minescript Minecraft Mod.
All scripts executed inside Minecraft using '/py' have access to this module.
"""

def echo(message: str) -> None:
    """
    Prints a message in the local Minecraft chat. Only visible to the local player.
    
    Args:
        message (str): The text message to display in the chat.
    """
    pass

def chat(message: str) -> None:
    """
    Sends a chat message to the server chat. Visible to all players online.
    
    Args:
        message (str): The chat message or public shout.
    """
    pass

def execute(command: str) -> str:
    """
    Executes an in-game Minecraft server command (like /tp, /give, /time, /setblock).
    Returns the command execution output response string.
    
    Args:
        command (str): The command to run (can be written with or without leading slash).
        
    Returns:
        str: Response/feedback message from the command block or server.
    """
    return ""

def player_position() -> list:
    """
    Gets the current coordinate position [x, y, z] of the local player.
    
    Returns:
        list: A list of three floats representing [x, y, z] player coordinates.
    """
    return [0.0, 0.0, 0.0]

def player_direction() -> list:
    """
    Gets the direction vector [x, y, z] indicating where the local player is currently looking.
    
    Returns:
        list: A list of three floats representing the looking direction vector.
    """
    return [0.0, 0.0, 0.0]

def get_block(x: int, y: int, z: int) -> str:
    """
    Gets the block ID at the specified absolute coordinate coordinates.
    
    Args:
        x (int): X coordinate
        y (int): Y coordinate
        z (int): Z coordinate
        
    Returns:
        str: The block type ID (e.g. "minecraft:stone", "minecraft:air").
    """
    return "minecraft:air"

def set_block(x: int, y: int, z: int, block_type: str) -> None:
    """
    Sets a single block at the specified absolute coordinate coordinates.
    
    Args:
        x (int): X coordinate
        y (int): Y coordinate
        z (int): Z coordinate
        block_type (str): The block type ID (e.g. "minecraft:diamond_block").
    """
    pass

def get_blocks(x1: int, y1: int, z1: int, x2: int, y2: int, z2: int) -> list:
    """
    Gets a list of blocks in the bounding box between coordinates (x1, y1, z1) and (x2, y2, z2).
    
    Returns:
        list: A flat list of block type IDs in the defined volume.
    """
    return []

def set_blocks(x1: int, y1: int, z1: int, x2: int, y2: int, z2: int, block_type: str) -> None:
    """
    Fills a rectangular 3D box region from (x1, y1, z1) to (x2, y2, z2) with a block.
    
    Args:
        x1, y1, z1 (int): Starting absolute coordinate
        x2, y2, z2 (int): Ending absolute coordinate
        block_type (str): The block type ID (e.g. "minecraft:gold_block").
    """
    pass

def await_chat(pattern: str) -> dict:
    """
    Suspends script execution until a chat message matches the given regex pattern.
    
    Args:
        pattern (str): The regex pattern to match.
        
    Returns:
        dict: A dictionary containing 'player' and 'message' of the matching chat.
    """
    return {"player": "", "message": ""}
`;

export const DEFAULT_MINESCRIPT_FUNCTIONS: MinescriptFunction[] = [
  {
    name: "echo",
    params: "message: str",
    description: "Prints a message in the local Minecraft chat. Only visible to the local player.",
    docstring: "echo(message: str) -> None\n\nPrints a message in the local Minecraft chat. Only visible to the local player. Great for printing debugging outputs or status updates inside your script.",
    sourceFile: "minescript.py"
  },
  {
    name: "chat",
    params: "message: str",
    description: "Sends a chat message to the server chat. Visible to all players online.",
    docstring: "chat(message: str) -> None\n\nSends a chat message to the server chat. Visible to all players online. Can be used to announce things, interact with multiplayer plugins, or talk with players.",
    sourceFile: "minescript.py"
  },
  {
    name: "execute",
    params: "command: str",
    description: "Executes an in-game Minecraft command (/tp, /give, /time, /setblock, etc.).",
    docstring: "execute(command: str) -> str\n\nExecutes an in-game Minecraft server command. Returns the output response string back to your script.",
    sourceFile: "minescript.py"
  },
  {
    name: "player_position",
    params: "",
    description: "Gets the current coordinate position [x, y, z] of the local player.",
    docstring: "player_position() -> list\n\nGets the current coordinate position [x, y, z] of the local player. Essential for building structures relative to where you are standing.",
    sourceFile: "minescript.py"
  },
  {
    name: "player_direction",
    params: "",
    description: "Gets the direction vector [x, y, z] indicating where the local player is currently looking.",
    docstring: "player_direction() -> list\n\nGets the direction vector [x, y, z] indicating where the local player is looking. Helpful for launching projectiles or building in front of yourself.",
    sourceFile: "minescript.py"
  },
  {
    name: "get_block",
    params: "x: int, y: int, z: int",
    description: "Gets the block ID at the specified absolute coordinates (e.g. 'minecraft:stone').",
    docstring: "get_block(x: int, y: int, z: int) -> str\n\nGets the block ID at the specified absolute coordinate coordinates. Returns values like 'minecraft:air', 'minecraft:stone', or 'minecraft:chest'.",
    sourceFile: "minescript.py"
  },
  {
    name: "set_block",
    params: "x: int, y: int, z: int, block_type: str",
    description: "Sets a single block at the specified absolute coordinates.",
    docstring: "set_block(x: int, y: int, z: int, block_type: str) -> None\n\nSets a single block at the specified absolute coordinate coordinates. Useful for precise block placements.",
    sourceFile: "minescript.py"
  },
  {
    name: "get_blocks",
    params: "x1: int, y1: int, z1: int, x2: int, y2: int, z2: int",
    description: "Gets a list of block IDs in the volume between coordinates.",
    docstring: "get_blocks(x1: int, y1: int, z1: int, x2: int, y2: int, z2: int) -> list\n\nGets a 3D flat list of blocks in the bounding box between coordinates (x1, y1, z1) and (x2, y2, z2).",
    sourceFile: "minescript.py"
  },
  {
    name: "set_blocks",
    params: "x1: int, y1: int, z1: int, x2: int, y2: int, z2: int, block_type: str",
    description: "Fills a rectangular 3D box region from (x1, y1, z1) to (x2, y2, z2) with a block.",
    docstring: "set_blocks(x1: int, y1: int, z1: int, x2: int, y2: int, z2: int, block_type: str) -> None\n\nFills a rectangular 3D box region from (x1, y1, z1) to (x2, y2, z2) with a block. Extremely fast for building walls, clearing spaces, or raising platforms.",
    sourceFile: "minescript.py"
  },
  {
    name: "await_chat",
    params: "pattern: str",
    description: "Suspends script execution until a chat message matches the given regex pattern.",
    docstring: "await_chat(pattern: str) -> dict\n\nSuspends script execution until a chat message matches the given regex pattern. Returns a dict with keys 'player' and 'message'. Highly useful for triggers, remote controls, or interactive scripts.",
    sourceFile: "minescript.py"
  }
];

export const DEFAULT_REFERENCE_FILE: ReferenceFile = {
  id: "minescript-default",
  name: "minescript.py (Official API)",
  content: DEFAULT_MINESCRIPT_CODE,
  size: DEFAULT_MINESCRIPT_CODE.length,
  isActive: true,
  functions: DEFAULT_MINESCRIPT_FUNCTIONS
};
