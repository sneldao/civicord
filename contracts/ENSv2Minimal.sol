// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.28;

/// @dev Minimal interfaces matched to the official ENSv2 Sepolia deployment (2026-05-25 r2).
///      We deploy no new contracts; this file exists so Foundry can type-check our scripts
///      against the exact official bytecode's ABI. Byte-accurate interfaces live upstream:
///      github.com/smaanich1/contracts-v2 (lib/verifiable-factory, src/registry, src/resolver).

interface IVerifiableFactory {
    /// @notice Deploy a UUPS proxy via CREATE2, initialize it, return its address.
    ///         outerSalt = keccak256(abi.encode(msg.sender, salt)).
    function deployProxy(address implementation, uint256 salt, bytes calldata data) external returns (address proxy);

    /// @notice Prove provenance: reconstructs CREATE2 address from proxy's stored salt + impl.
    function verifyContract(address proxy, address expectedImplementation) external view returns (bool);

    event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation);
}

interface IUserRegistry {
    /// @notice Initialize the UserRegistry clone. rootAccount gets roleBitmap roles on ROOT_RESOURCE.
    function initialize(address rootAccount, uint256 roleBitmap) external;

    /// @notice Register a subname. registry=0 → no subregistry; expiry=type(uint64).max → never expires.
    function register(
        string calldata label,
        address owner,
        address registry,
        address resolver,
        uint256 roleBitmap,
        uint64 expiry
    ) external returns (uint256 tokenId);
}

interface IPermissionedRegistry /* parent (.eth) registry for setSubregistry/setResolver */ {
    function setSubregistry(string calldata label, address subregistry) external;
    function setResolver(string calldata label, address resolver) external;
    function getSubregistry(string calldata label) external view returns (address);
    function getResolver(string calldata label) external view returns (address);
}

interface IPermissionedResolver {
    function initialize(address admin, uint256 roleBitmap, bytes[] calldata setters) external;
    function setText(bytes32 node, string calldata key, string calldata value) external returns (bool);
    function text(bytes32 node, string calldata key) external view returns (string memory);
}
