// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Public identity registry: a wallet claims a display name (and optionally an
/// avatar URL) that every Presaghe user sees, replacing the generated pseudonym.
/// Deliberately tiny: no uniqueness, no moderation — a name is just a label the
/// owner can change or clear at any time.
contract ProfileRegistry {
    struct Profile {
        string name;
        string avatar; // URL only — image bytes don't belong on-chain
    }

    mapping(address => Profile) private _profiles;

    event ProfileSet(address indexed user, string name, string avatar);

    function setProfile(string calldata name, string calldata avatar) external {
        require(bytes(name).length <= 32, "name too long");
        require(bytes(avatar).length <= 200, "avatar too long");
        _profiles[msg.sender] = Profile(name, avatar);
        emit ProfileSet(msg.sender, name, avatar);
    }

    function clearProfile() external {
        delete _profiles[msg.sender];
        emit ProfileSet(msg.sender, "", "");
    }

    function getProfile(address user) external view returns (string memory name, string memory avatar) {
        Profile storage p = _profiles[user];
        return (p.name, p.avatar);
    }
}
