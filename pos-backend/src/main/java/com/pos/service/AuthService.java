package com.pos.service;

import com.pos.model.User;
import com.pos.model.Role;
import com.pos.repository.UserRepository;
import com.pos.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public User registerUser(String username, String password, String roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(Role.builder().name(roleName).build()));

        Set<Role> roles = new HashSet<>();
        roles.add(role);

        User user = User.builder()
                .username(username)
                .password(password) // Note: Should be encoded in real scenarios
                .roles(roles)
                .enabled(true)
                .build();

        return userRepository.save(user);
    }

    public Optional<User> login(String username, String password) {
        return userRepository.findByUsername(username)
                .filter(user -> user.getPassword().equals(password));
    }
}
